"use client";

import {
  BarChart,
  Bar,
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

export function GraficaBarras({ datos, cargando }: Props) {
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
          <CardTitle>Ingresos por categoría mensual</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-72 text-gray-400">
          Sin datos disponibles
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos por categoría mensual</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
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
            <Bar dataKey="producto_digital" name="Prod. Digital" stackId="a" fill="#6366f1" />
            <Bar dataKey="mentoria" name="Mentoría" stackId="a" fill="#f97316" />
            <Bar dataKey="servicio" name="Servicio" stackId="a" fill="#10b981" />
            <Bar dataKey="membresia" name="Membresía" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
