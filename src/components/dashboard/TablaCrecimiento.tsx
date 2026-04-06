"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MesData } from "@/types";

interface Props {
  datos: MesData[];
  cargando: boolean;
}

function formatUSD(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(valor);
}

export function TablaCrecimiento({ datos, cargando }: Props) {
  if (cargando) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Últimos 13 meses para poder calcular el delta del primero
  const ultimos = datos.slice(-13);

  const filas = ultimos.slice(1).map((mes, i) => {
    const anterior = ultimos[i];
    const delta = mes.total - anterior.total;
    const pct = anterior.total > 0 ? (delta / anterior.total) * 100 : 0;
    return { mes, delta, pct };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crecimiento mes a mes (últimos 12 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        {filas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            Sin datos suficientes para comparar meses
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Mes</th>
                  <th className="pb-2 font-medium text-right">Ingresos</th>
                  <th className="pb-2 font-medium text-right">vs Mes Anterior</th>
                  <th className="pb-2 font-medium text-right">% Cambio</th>
                </tr>
              </thead>
              <tbody>
                {[...filas].reverse().map(({ mes, delta, pct }) => (
                  <tr key={mes.mes} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-medium capitalize">{mes.label}</td>
                    <td className="py-2 text-right">{formatUSD(mes.total)}</td>
                    <td className={`py-2 text-right ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {delta >= 0 ? "+" : ""}{formatUSD(delta)}
                    </td>
                    <td className={`py-2 text-right font-bold ${pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
