"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MesData } from "@/types";

const COLORES_PLATAFORMA: Record<string, string> = {
  Hotmart: "#f97316",
  Stripe: "#6366f1",
  Bancolombia: "#10b981",
};

const COLORES_CATEGORIA: Record<string, string> = {
  "Prod. Digital": "#6366f1",
  Mentoría: "#f97316",
  Servicio: "#10b981",
  Membresía: "#f59e0b",
};

interface Props {
  datos: MesData[];
  cargando: boolean;
}

function formatUSD(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(valor);
}

export function GraficasDonut({ datos, cargando }: Props) {
  if (cargando) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Agregar totales
  const totales = datos.reduce(
    (acc, m) => {
      acc.hotmart += m.hotmart;
      acc.stripe += m.stripe;
      acc.bancolombia += m.bancolombia;
      acc.producto_digital += m.producto_digital;
      acc.mentoria += m.mentoria;
      acc.servicio += m.servicio;
      acc.membresia += m.membresia;
      return acc;
    },
    { hotmart: 0, stripe: 0, bancolombia: 0, producto_digital: 0, mentoria: 0, servicio: 0, membresia: 0 }
  );

  const plataformaData = [
    { name: "Hotmart", value: totales.hotmart },
    { name: "Stripe", value: totales.stripe },
    { name: "Bancolombia", value: totales.bancolombia },
  ].filter((d) => d.value > 0);

  const categoriaData = [
    { name: "Prod. Digital", value: totales.producto_digital },
    { name: "Mentoría", value: totales.mentoria },
    { name: "Servicio", value: totales.servicio },
    { name: "Membresía", value: totales.membresia },
  ].filter((d) => d.value > 0);

  const renderEtiqueta = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
    if ((percent ?? 0) < 0.05) return null;
    const pct = percent ?? 0;
    const ir = innerRadius as number;
    const or = outerRadius as number;
    const RADIAN = Math.PI / 180;
    const radius = ir + (or - ir) * 0.5;
    const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
    const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(pct * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ingresos por plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          {plataformaData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={plataformaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  labelLine={false}
                  label={renderEtiqueta}
                >
                  {plataformaData.map((entry) => (
                    <Cell key={entry.name} fill={COLORES_PLATAFORMA[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatUSD(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingresos por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {categoriaData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoriaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  labelLine={false}
                  label={renderEtiqueta}
                >
                  {categoriaData.map((entry) => (
                    <Cell key={entry.name} fill={COLORES_CATEGORIA[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatUSD(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
