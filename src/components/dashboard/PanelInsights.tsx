"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { KPIsDashboard } from "@/types";

interface Props {
  kpis: KPIsDashboard | null;
  cargando: boolean;
}

function formatUSD(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(valor);
}

export function PanelInsights({ kpis, cargando }: Props) {
  if (cargando) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  const crecimientoAnual =
    kpis.totalMismoPeriodoAnioAnterior > 0
      ? ((kpis.totalAnioActual - kpis.totalMismoPeriodoAnioAnterior) /
          kpis.totalMismoPeriodoAnioAnterior) *
        100
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis del negocio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {kpis.mejorMes && (
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Mejor mes histórico</p>
              <p className="text-sm text-green-700">
                {kpis.mejorMes.label} — {formatUSD(kpis.mejorMes.total)}
              </p>
            </div>
          </div>
        )}

        {kpis.peorMes && (
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <span className="text-2xl">📉</span>
            <div>
              <p className="text-sm font-semibold text-red-800">Mes más bajo (últimos 12m)</p>
              <p className="text-sm text-red-700">
                {kpis.peorMes.label} — {formatUSD(kpis.peorMes.total)}
              </p>
            </div>
          </div>
        )}

        {kpis.rachaActual > 0 && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Racha de crecimiento</p>
              <p className="text-sm text-blue-700">
                {kpis.rachaActual} {kpis.rachaActual === 1 ? "mes" : "meses"} consecutivos creciendo
              </p>
            </div>
          </div>
        )}

        {crecimientoAnual !== null && (
          <div
            className={`flex items-start gap-3 p-3 rounded-lg ${
              crecimientoAnual >= 0 ? "bg-green-50" : "bg-orange-50"
            }`}
          >
            <span className="text-2xl">{crecimientoAnual >= 0 ? "📈" : "⚠️"}</span>
            <div>
              <p
                className={`text-sm font-semibold ${
                  crecimientoAnual >= 0 ? "text-green-800" : "text-orange-800"
                }`}
              >
                Crecimiento anual
              </p>
              <p
                className={`text-sm ${
                  crecimientoAnual >= 0 ? "text-green-700" : "text-orange-700"
                }`}
              >
                {crecimientoAnual >= 0 ? "+" : ""}{crecimientoAnual.toFixed(1)}% vs mismo período año anterior
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Este año: {formatUSD(kpis.totalAnioActual)} | Año anterior: {formatUSD(kpis.totalMismoPeriodoAnioAnterior)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Promedio mensual (12m)</p>
            <p className="text-sm text-gray-600">
              {formatUSD(kpis.promedioMensual12m)} por mes
              {kpis.ingresosMesActual > kpis.promedioMensual12m
                ? " — este mes supera el promedio ✓"
                : kpis.ingresosMesActual > 0
                ? " — este mes está por debajo del promedio"
                : ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
