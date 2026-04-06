"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DatosLTV } from "@/types";

interface Props {
  datos: DatosLTV | null;
  cargando: boolean;
}

function formatUSD(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

const COLORES = ["#6366f1", "#f97316", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];

export function PanelClientes({ datos, cargando }: Props) {
  if (cargando) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 bg-gray-50">
              <CardContent className="pt-4 pb-3">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!datos || datos.totalCompradores === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <p className="text-gray-400 text-sm">
            Sin datos de compradores — para calcular LTV y recompra, importa archivos que incluyan la columna de email del comprador
          </p>
          <p className="text-gray-300 text-xs">
            Hotmart: &quot;Email do Comprador&quot; · Stripe: &quot;customer_email&quot;
          </p>
        </CardContent>
      </Card>
    );
  }

  const { tasaRecompraGeneral, totalCompradores, compradoresRecurrentes, ltvPromedio,
    topCompradores, distribucionCompras, recompraPorProducto } = datos;

  const distribucionLabel = (n: number) =>
    n >= 5 ? "5+ compras" : n === 1 ? "1 compra" : `${n} compras`;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 bg-indigo-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-indigo-600 font-medium">Total compradores</p>
            <p className="text-2xl font-bold text-indigo-800 mt-1">{totalCompradores.toLocaleString()}</p>
            <p className="text-xs text-indigo-500 mt-1">Con email identificado</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-orange-600 font-medium">Tasa de recompra</p>
            <p className="text-2xl font-bold text-orange-800 mt-1">{tasaRecompraGeneral}%</p>
            <p className="text-xs text-orange-500 mt-1">{compradoresRecurrentes} compradores recurrentes</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-emerald-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-emerald-600 font-medium">LTV promedio</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{formatUSD(ltvPromedio)}</p>
            <p className="text-xs text-emerald-500 mt-1">Por comprador</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-purple-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-purple-600 font-medium">LTV top comprador</p>
            <p className="text-2xl font-bold text-purple-800 mt-1">
              {topCompradores.length > 0 ? formatUSD(topCompradores[0].totalUSD) : "$0"}
            </p>
            <p className="text-xs text-purple-500 mt-1 truncate">
              {topCompradores[0]?.nombre ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución + Recompra por producto */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Distribución de compras por comprador */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Distribución de compras por comprador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={distribucionCompras}
                    dataKey="cantidad"
                    nameKey="compras"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                  >
                    {distribucionCompras.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown, _: unknown, entry: { payload?: { compras: number } }) => [
                      `${value} compradores`,
                      distribucionLabel(entry.payload?.compras ?? 0),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {distribucionCompras.map((d, i) => (
                  <div key={d.compras} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                      <span className="text-gray-600">{distribucionLabel(d.compras)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-800">{d.cantidad}</span>
                      <span className="text-gray-400 text-xs ml-1">
                        ({Math.round((d.cantidad / totalCompradores) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recompra por producto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Tasa de recompra por producto</CardTitle>
          </CardHeader>
          <CardContent>
            {recompraPorProducto.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                Sin suficientes compradores por producto para mostrar estadísticas
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={recompraPorProducto.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 0, right: 30, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="producto"
                    tick={{ fontSize: 10 }}
                    width={110}
                    tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + "…" : v}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`${value}%`, "Tasa recompra"]}
                    labelFormatter={(label: unknown) => String(label)}
                  />
                  <Bar dataKey="tasaRecompra" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla Top compradores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">Top compradores por LTV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Comprador</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">LTV</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Compras</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Productos</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {topCompradores.map((c, i) => (
                  <tr key={c.email} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-gray-800 truncate max-w-[180px]">
                        {c.nombre !== c.email ? c.nombre : "—"}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.email}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatUSD(c.totalUSD)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        c.numCompras >= 3 ? "bg-indigo-100 text-indigo-700" :
                        c.numCompras === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {c.numCompras}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.productos.slice(0, 2).map((p) => (
                          <span key={p} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 truncate max-w-[120px]">
                            {p}
                          </span>
                        ))}
                        {c.productos.length > 2 && (
                          <span className="text-xs text-gray-400">+{c.productos.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs hidden md:table-cell">
                      {new Date(c.ultimaCompra).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
