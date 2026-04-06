"use client";

import { useEffect, useState, useCallback } from "react";
import { ResumenIngresos } from "@/components/dashboard/ResumenIngresos";
import { GraficaTendencia } from "@/components/dashboard/GraficaTendencia";
import { GraficaBarras } from "@/components/dashboard/GraficaBarras";
import { GraficasDonut } from "@/components/dashboard/GraficasDonut";
import { TablaCrecimiento } from "@/components/dashboard/TablaCrecimiento";
import { PanelInsights } from "@/components/dashboard/PanelInsights";
import { GraficaFacturacionMensual } from "@/components/dashboard/GraficaFacturacionMensual";
import { PanelClientes } from "@/components/dashboard/PanelClientes";
import type { KPIsDashboard, MesData, DatosLTV } from "@/types";

const RANGOS = [
  { label: "6 meses", meses: 6 },
  { label: "12 meses", meses: 12 },
  { label: "24 meses", meses: 24 },
];

const PESTANAS = [
  { id: "resumen", label: "Resumen" },
  { id: "facturacion", label: "Facturación mensual" },
  { id: "clientes", label: "Clientes & LTV" },
];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIsDashboard | null>(null);
  const [datosMensuales, setDatosMensuales] = useState<MesData[]>([]);
  const [datosLTV, setDatosLTV] = useState<DatosLTV | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoLTV, setCargandoLTV] = useState(false);
  const [rango, setRango] = useState(12);
  const [pestana, setPestana] = useState("resumen");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [kpisRes, mensualRes] = await Promise.all([
        fetch("/api/analiticas?vista=kpis"),
        fetch(`/api/analiticas?vista=mensual&meses=${rango}`),
      ]);
      const [kpisData, mensualData] = await Promise.all([
        kpisRes.json(),
        mensualRes.json(),
      ]);
      setKpis(kpisData);
      setDatosMensuales(Array.isArray(mensualData) ? mensualData : []);
    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setCargando(false);
    }
  }, [rango]);

  const cargarLTV = useCallback(async () => {
    if (datosLTV) return; // ya cargado
    setCargandoLTV(true);
    try {
      const res = await fetch("/api/analiticas?vista=ltv");
      const data = await res.json();
      setDatosLTV(data);
    } catch (e) {
      console.error("Error cargando LTV:", e);
    } finally {
      setCargandoLTV(false);
    }
  }, [datosLTV]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    if (pestana === "clientes") cargarLTV();
  }, [pestana, cargarLTV]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Hotmart · Stripe · Bancolombia
          </p>
        </div>
        <div className="flex gap-2">
          {RANGOS.map((r) => (
            <button
              key={r.meses}
              onClick={() => setRango(r.meses)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                rango === r.meses
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:border-blue-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex border-b border-gray-200 gap-1">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestana(p.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              pestana === p.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Pestaña: Resumen */}
      {pestana === "resumen" && (
        <div className="space-y-6">
          <ResumenIngresos kpis={kpis} cargando={cargando} />
          <GraficaTendencia datos={datosMensuales} cargando={cargando} />
          <GraficaBarras datos={datosMensuales} cargando={cargando} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <GraficasDonut datos={datosMensuales} cargando={cargando} />
            </div>
            <div>
              <PanelInsights kpis={kpis} cargando={cargando} />
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Facturación mensual */}
      {pestana === "facturacion" && (
        <div className="space-y-6">
          <GraficaFacturacionMensual datos={datosMensuales} cargando={cargando} />
          <TablaCrecimiento datos={datosMensuales} cargando={cargando} />
        </div>
      )}

      {/* Pestaña: Clientes & LTV */}
      {pestana === "clientes" && (
        <div className="space-y-6">
          <PanelClientes datos={datosLTV} cargando={cargandoLTV} />
        </div>
      )}
    </div>
  );
}
