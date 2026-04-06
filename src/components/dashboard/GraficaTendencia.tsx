"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MesData } from "@/types";

interface Props {
  datos: MesData[];
  cargando: boolean;
}

function formatUSD(valor: number) {
  if (valor >= 1000) return `$${(valor / 1000).toFixed(1)}k`;
  return `$${valor.toFixed(0)}`;
}

export function GraficaTendencia({ datos, cargando }: Props) {
  if (cargando) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (datos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de ingresos por plataforma</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-72 text-gray-400">
          Sin datos — importa transacciones para ver la tendencia
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de ingresos por plataforma</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={datos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatUSD} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) =>
                new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "USD",
                }).format(Number(value))
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="hotmart"
              name="Hotmart"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="stripe"
              name="Stripe"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="bancolombia"
              name="Bancolombia"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="#1d4ed8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              strokeDasharray="5 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
