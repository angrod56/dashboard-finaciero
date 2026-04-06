"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaccion {
  id: string;
  plataforma: string;
  montoUSD: number;
  montoOriginal: number;
  moneda: string;
  categoria: string;
  nombreProducto: string;
  estado: string;
  fechaTransaccion: string;
  fuente: string;
}

const ESTADO_COLOR: Record<string, string> = {
  completado: "bg-green-100 text-green-800",
  reembolsado: "bg-yellow-100 text-yellow-800",
  contracargo: "bg-red-100 text-red-800",
};

const PLATAFORMA_COLOR: Record<string, string> = {
  hotmart: "bg-orange-100 text-orange-800",
  stripe: "bg-indigo-100 text-indigo-800",
  bancolombia: "bg-green-100 text-green-800",
};

const CATEGORIA_LABEL: Record<string, string> = {
  producto_digital: "Prod. Digital",
  mentoria: "Mentoría",
  servicio: "Servicio",
  membresia: "Membresía",
};

function formatUSD(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(v);
}

function formatMonto(v: number, moneda: string) {
  try {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda }).format(v);
  } catch {
    return `${moneda} ${v.toFixed(2)}`;
  }
}

export default function TransaccionesPage() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [filtroPlataforma, setFiltroPlataforma] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina), porPagina: "50" });
      if (filtroPlataforma !== "todas") params.set("plataforma", filtroPlataforma);
      if (filtroCategoria !== "todas") params.set("categoria", filtroCategoria);
      if (filtroEstado !== "todos") params.set("estado", filtroEstado);

      const res = await fetch(`/api/transacciones?${params}`);
      const data = await res.json();
      setTransacciones(data.transacciones ?? []);
      setTotal(data.total ?? 0);
      setTotalPaginas(data.totalPaginas ?? 1);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [pagina, filtroPlataforma, filtroCategoria, filtroEstado]);

  useEffect(() => {
    setPagina(1);
  }, [filtroPlataforma, filtroCategoria, filtroEstado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} transacciones en total</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filtroPlataforma} onValueChange={(v) => setFiltroPlataforma(v ?? "todas")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las plataformas</SelectItem>
            <SelectItem value="hotmart">Hotmart</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="bancolombia">Bancolombia</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(v ?? "todas")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            <SelectItem value="producto_digital">Prod. Digital</SelectItem>
            <SelectItem value="mentoria">Mentoría</SelectItem>
            <SelectItem value="servicio">Servicio</SelectItem>
            <SelectItem value="membresia">Membresía</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v ?? "todos")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="reembolsado">Reembolsado</SelectItem>
            <SelectItem value="contracargo">Contracargo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : transacciones.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg mb-2">Sin transacciones</p>
              <p className="text-sm">Importa archivos en la sección &quot;Importar datos&quot; para comenzar.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500 text-left">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Plataforma</th>
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium">Categoría</th>
                      <th className="pb-2 font-medium text-right">Monto</th>
                      <th className="pb-2 font-medium text-right">USD</th>
                      <th className="pb-2 font-medium text-center">Estado</th>
                      <th className="pb-2 font-medium text-center">Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacciones.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 text-gray-500 whitespace-nowrap">
                          {new Date(t.fechaTransaccion).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2">
                          <Badge className={PLATAFORMA_COLOR[t.plataforma] ?? "bg-gray-100"}>
                            {t.plataforma}
                          </Badge>
                        </td>
                        <td className="py-2 max-w-[200px] truncate" title={t.nombreProducto}>
                          {t.nombreProducto}
                        </td>
                        <td className="py-2 text-gray-500">
                          {CATEGORIA_LABEL[t.categoria] ?? t.categoria}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          {formatMonto(t.montoOriginal, t.moneda)}
                        </td>
                        <td className="py-2 text-right font-medium whitespace-nowrap">
                          {formatUSD(t.montoUSD)}
                        </td>
                        <td className="py-2 text-center">
                          <Badge className={ESTADO_COLOR[t.estado] ?? "bg-gray-100"}>
                            {t.estado}
                          </Badge>
                        </td>
                        <td className="py-2 text-center text-xs text-gray-400">
                          {t.fuente === "webhook" ? "🔗 webhook" : "📥 import"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-gray-500">
                    Página {pagina} de {totalPaginas}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:border-blue-400"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                      className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:border-blue-400"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
