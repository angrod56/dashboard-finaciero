"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { KPIsDashboard } from "@/types";

function formatUSD(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(valor);
}

interface Props {
  kpis: KPIsDashboard | null;
  cargando: boolean;
}

export function ResumenIngresos({ kpis, cargando }: Props) {
  if (cargando) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const cambioColor =
    kpis.cambioMoM > 0
      ? "text-green-600"
      : kpis.cambioMoM < 0
      ? "text-red-600"
      : "text-gray-500";

  const cambioIcono = kpis.cambioMoM > 0 ? "↑" : kpis.cambioMoM < 0 ? "↓" : "→";

  const crecimientoAnual =
    kpis.totalMismoPeriodoAnioAnterior > 0
      ? ((kpis.totalAnioActual - kpis.totalMismoPeriodoAnioAnterior) /
          kpis.totalMismoPeriodoAnioAnterior) *
        100
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Ingresos este mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatUSD(kpis.ingresosMesActual)}</p>
          <p className={`text-sm mt-1 font-medium ${cambioColor}`}>
            {cambioIcono} {Math.abs(kpis.cambioMoM).toFixed(1)}% vs mes anterior
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Promedio mensual (12m)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatUSD(kpis.promedioMensual12m)}</p>
          {kpis.rachaActual > 0 && (
            <p className="text-sm mt-1 text-green-600 font-medium">
              Creciendo {kpis.rachaActual} {kpis.rachaActual === 1 ? "mes" : "meses"} consecutivos
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Total acumulado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatUSD(kpis.totalAcumulado)}</p>
          <p className="text-sm mt-1 text-gray-500">Todos los tiempos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Año actual vs año anterior
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatUSD(kpis.totalAnioActual)}</p>
          {kpis.totalMismoPeriodoAnioAnterior > 0 && (
            <p
              className={`text-sm mt-1 font-medium ${
                crecimientoAnual >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {crecimientoAnual >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(crecimientoAnual).toFixed(1)}% vs año anterior
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
