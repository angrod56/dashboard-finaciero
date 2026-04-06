"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MesData } from "@/types";

interface Props {
  datos: MesData[];
  cargando: boolean;
}

function formatUSD(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function formatUSDCompleto(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(v);
}

// Tooltip personalizado
function TooltipPersonalizado({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.find((p) => p.name === "total");
  const anterior = payload.find((p) => p.name === "anterior");
  const crecimiento = anterior && anterior.value > 0 && total
    ? ((total.value - anterior.value) / anterior.value) * 100
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-gray-700 mb-2 capitalize">{label}</p>
      {total && (
        <p className="text-gray-900 font-bold">{formatUSDCompleto(total.value)}</p>
      )}
      {crecimiento !== null && (
        <p className={`text-xs mt-1 font-medium ${crecimiento >= 0 ? "text-green-600" : "text-red-600"}`}>
          {crecimiento >= 0 ? "↑" : "↓"} {Math.abs(crecimiento).toFixed(1)}% vs mes anterior
        </p>
      )}
    </div>
  );
}

export function GraficaFacturacionMensual({ datos, cargando }: Props) {
  if (cargando) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-56" /></CardHeader>
        <CardContent><Skeleton className="h-96 w-full" /></CardContent>
      </Card>
    );
  }

  if (datos.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Facturación mensual</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-96 text-gray-400">
          Sin datos — importa transacciones para ver la facturación
        </CardContent>
      </Card>
    );
  }

  // Calcular promedio
  const promedio = datos.reduce((s, m) => s + m.total, 0) / datos.length;

  // Agregar columna "anterior" para el tooltip
  const datosConCrecimiento = datos.map((m, i) => {
    const ant = i > 0 ? datos[i - 1].total : null;
    const pct = ant && ant > 0 ? ((m.total - ant) / ant) * 100 : null;
    return { ...m, anterior: ant ?? 0, pct };
  });

  // KPIs de crecimiento
  const ultimo = datos[datos.length - 1];
  const penultimo = datos[datos.length - 2];
  const mejorMes = [...datos].sort((a, b) => b.total - a.total)[0];
  const totalPeriodo = datos.reduce((s, m) => s + m.total, 0);

  const cambioUltimo = penultimo && penultimo.total > 0
    ? ((ultimo.total - penultimo.total) / penultimo.total) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 bg-blue-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-blue-600 font-medium">Último mes</p>
            <p className="text-xl font-bold text-blue-800 mt-1">{formatUSDCompleto(ultimo?.total ?? 0)}</p>
            {cambioUltimo !== 0 && (
              <p className={`text-xs mt-1 font-medium ${cambioUltimo >= 0 ? "text-green-600" : "text-red-500"}`}>
                {cambioUltimo >= 0 ? "↑" : "↓"} {Math.abs(cambioUltimo).toFixed(1)}% vs anterior
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 bg-green-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-green-600 font-medium">Mejor mes</p>
            <p className="text-xl font-bold text-green-800 mt-1">{formatUSDCompleto(mejorMes?.total ?? 0)}</p>
            <p className="text-xs text-green-600 mt-1 capitalize">{mejorMes?.label ?? ""}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-purple-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-purple-600 font-medium">Promedio mensual</p>
            <p className="text-xl font-bold text-purple-800 mt-1">{formatUSDCompleto(promedio)}</p>
            <p className="text-xs text-purple-500 mt-1">En el período</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-indigo-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-indigo-600 font-medium">Total período</p>
            <p className="text-xl font-bold text-indigo-800 mt-1">{formatUSDCompleto(totalPeriodo)}</p>
            <p className="text-xs text-indigo-500 mt-1">{datos.length} meses</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico principal */}
      <Card>
        <CardHeader>
          <CardTitle>Facturación bruta mensual (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={datosConCrecimiento} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatUSD}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <ReferenceLine
                y={promedio}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: "Promedio", position: "right", fontSize: 10, fill: "#94a3b8" }}
              />
              <Bar
                dataKey="total"
                name="total"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="anterior"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3, fill: "#f97316" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Barras = facturación mensual · Línea = tendencia · Línea punteada = promedio del período
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
