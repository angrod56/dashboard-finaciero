"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plataforma } from "@/types";

interface PreviewData {
  total: number;
  nuevas: number;
  duplicadas: number;
  totalUSD: number;
  erroresParseo: string[];
  columnasDetectadas?: string[];
  filaEjemplo?: Record<string, string>;
  resumenMensual: Array<{ mes: string; label: string; cantidad: number; total: number }>;
  preview: Array<{
    fecha: string;
    producto: string;
    montoOriginal: number;
    moneda: string;
    montoUSD: number;
    estado: string;
    esDuplicada: boolean;
  }>;
}

function formatUSD(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(v);
}


const PLATAFORMAS: Array<{ id: Plataforma; nombre: string; formatos: string; extensiones: string }> = [
  { id: "hotmart", nombre: "Hotmart", formatos: "CSV", extensiones: ".csv" },
  { id: "stripe", nombre: "Stripe", formatos: "CSV", extensiones: ".csv" },
  { id: "bancolombia", nombre: "Bancolombia", formatos: "Excel", extensiones: ".xlsx,.xls" },
];

// Columnas requeridas por plataforma para orientar al usuario
const COLUMNAS_REQUERIDAS: Record<Plataforma, { campo: string; posibles: string[] }[]> = {
  hotmart: [
    { campo: "ID transacción", posibles: ["Cod. Transação", "Transaction Code", "Código de Transacción", "cod_transaction"] },
    { campo: "Fecha", posibles: ["Data Compra", "Purchase Date", "Fecha Compra"] },
    { campo: "Monto", posibles: ["Valor Líquido", "Net Value", "Valor Neto"] },
    { campo: "Producto", posibles: ["Produto", "Product", "Producto"] },
  ],
  stripe: [
    { campo: "ID transacción", posibles: ["id"] },
    { campo: "Fecha", posibles: ["Created date (UTC)", "Created (UTC)", "created"] },
    { campo: "Monto", posibles: ["amount", "Amount", "net"] },
    { campo: "Descripción", posibles: ["description", "Description"] },
  ],
  bancolombia: [
    { campo: "Fecha", posibles: ["Fecha"] },
    { campo: "Descripción", posibles: ["Descripción", "Concepto", "Descripcion"] },
    { campo: "Crédito (ingresos)", posibles: ["Crédito", "Abono", "Credito"] },
  ],
};

export function ZonaImportacion({ onImportado }: { onImportado?: () => void }) {
  const [plataforma, setPlataforma] = useState<Plataforma>("hotmart");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState<"idle" | "preview" | "confirmado" | "error">("idle");
  const [mensaje, setMensaje] = useState("");
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const plataformaInfo = PLATAFORMAS.find((p) => p.id === plataforma)!;

  const handleArchivo = async (file: File) => {
    setArchivo(file);
    setPreview(null);
    setEstado("idle");
    setMostrarDiagnostico(false);

    const nombre = file.name.toLowerCase();
    if (nombre.includes("hotmart")) setPlataforma("hotmart");
    else if (nombre.includes("stripe")) setPlataforma("stripe");
    else if (nombre.includes("bancolombia") || nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) {
      setPlataforma("bancolombia");
    }
  };

  const obtenerPreview = async () => {
    if (!archivo) return;
    setCargando(true);
    setMostrarDiagnostico(false);
    try {
      const form = new FormData();
      form.append("archivo", archivo);
      form.append("plataforma", plataforma);
      form.append("modo", "preview");

      const res = await fetch("/api/importar", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Error al analizar el archivo");

      setPreview(data);
      setEstado("preview");

      // Si todas son errores de ID, activar diagnóstico automáticamente
      const todasSinId = data.erroresParseo?.length > 0 &&
        data.total === 0 &&
        data.erroresParseo.every((e: string) => e.includes("sin ID"));
      if (todasSinId) setMostrarDiagnostico(true);
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "Error desconocido");
      setEstado("error");
    } finally {
      setCargando(false);
    }
  };

  const confirmarImport = async () => {
    if (!archivo) return;
    setCargando(true);
    try {
      const form = new FormData();
      form.append("archivo", archivo);
      form.append("plataforma", plataforma);
      form.append("modo", "confirmar");

      const res = await fetch("/api/importar", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Error al importar");

      setMensaje(
        `✅ Importación completada: ${data.insertadas} insertadas, ${data.omitidas} omitidas, ${data.errores} errores.`
      );
      setEstado("confirmado");
      setArchivo(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      onImportado?.();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "Error desconocido");
      setEstado("error");
    } finally {
      setCargando(false);
    }
  };

  // Compara columnas requeridas con detectadas
  const analizarColumnas = (
    requeridas: typeof COLUMNAS_REQUERIDAS[Plataforma],
    detectadas: string[]
  ) => {
    const detectadasLower = detectadas.map((c) => c.toLowerCase());
    return requeridas.map((req) => {
      const encontrada = req.posibles.find((p) =>
        detectadasLower.includes(p.toLowerCase())
      );
      return { ...req, encontrada: encontrada ?? null };
    });
  };

  return (
    <div className="space-y-4">
      {/* Selector de plataforma */}
      <div className="flex gap-2 flex-wrap">
        {PLATAFORMAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlataforma(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              plataforma === p.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {/* Zona de arrastre */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleArchivo(file);
        }}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-gray-600 font-medium">
          Arrastra tu archivo de {plataformaInfo.nombre} aquí
        </p>
        <p className="text-sm text-gray-400 mt-1">
          o haz clic para seleccionar — Formato: {plataformaInfo.formatos}
        </p>
        {archivo && (
          <div className="mt-3 inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            <span>📄</span>
            <span>{archivo.name}</span>
            <span className="text-green-600">({(archivo.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={plataformaInfo.extensiones}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleArchivo(file);
          }}
        />
      </div>

      {/* Acciones */}
      {archivo && estado !== "confirmado" && (
        <div className="flex gap-3 flex-wrap">
          <Button onClick={obtenerPreview} disabled={cargando} variant="outline">
            {cargando ? "Analizando..." : "Analizar archivo"}
          </Button>
          {estado === "preview" && preview && preview.nuevas > 0 && (
            <Button onClick={confirmarImport} disabled={cargando}>
              {cargando ? "Importando..." : `Importar ${preview.nuevas} transacciones`}
            </Button>
          )}
          {estado === "preview" && (
            <Button
              variant="outline"
              onClick={() => setMostrarDiagnostico((v) => !v)}
              className="text-gray-500"
            >
              🔍 {mostrarDiagnostico ? "Ocultar" : "Ver"} diagnóstico de columnas
            </Button>
          )}
        </div>
      )}

      {/* Panel de diagnóstico */}
      {mostrarDiagnostico && preview && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">
              🔍 Diagnóstico de columnas detectadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Columnas que encontró en el archivo */}
            <div>
              <p className="font-medium text-blue-800 mb-2">
                Columnas encontradas en tu archivo ({preview.columnasDetectadas?.length ?? 0}):
              </p>
              <div className="flex flex-wrap gap-1">
                {(preview.columnasDetectadas ?? []).map((col) => (
                  <span
                    key={col}
                    className="bg-white border border-blue-300 text-blue-700 px-2 py-0.5 rounded text-xs font-mono"
                  >
                    {col}
                  </span>
                ))}
                {(preview.columnasDetectadas ?? []).length === 0 && (
                  <span className="text-red-600">No se detectaron columnas — verifica que el archivo sea correcto</span>
                )}
              </div>
            </div>

            {/* Mapeo requerido vs detectado */}
            <div>
              <p className="font-medium text-blue-800 mb-2">
                Mapeo de campos requeridos:
              </p>
              <div className="space-y-1">
                {analizarColumnas(
                  COLUMNAS_REQUERIDAS[plataforma],
                  preview.columnasDetectadas ?? []
                ).map((req) => (
                  <div key={req.campo} className="flex items-start gap-2">
                    <span className={req.encontrada ? "text-green-600" : "text-red-600"}>
                      {req.encontrada ? "✓" : "✗"}
                    </span>
                    <div>
                      <span className="font-medium">
                        {req.campo}
                      </span>
                      {req.encontrada ? (
                        <span className="text-green-700 ml-2">
                          → columna <code className="bg-green-100 px-1 rounded">{req.encontrada}</code>
                        </span>
                      ) : (
                        <span className="text-red-600 ml-2">
                          No encontrado. Esperaba: <code className="bg-red-100 px-1 rounded">{req.posibles.join(" | ")}</code>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primera fila de ejemplo */}
            {preview.filaEjemplo && Object.keys(preview.filaEjemplo).length > 0 && (
              <div>
                <p className="font-medium text-blue-800 mb-2">Primera fila de datos (ejemplo):</p>
                <div className="bg-white rounded border border-blue-200 overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b bg-blue-50">
                        {Object.keys(preview.filaEjemplo).map((col) => (
                          <th key={col} className="px-2 py-1 text-left font-mono text-blue-700 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {Object.values(preview.filaEjemplo).map((val, i) => (
                          <td key={i} className="px-2 py-1 text-gray-600 whitespace-nowrap max-w-[150px] truncate">
                            {val || <span className="text-gray-300">(vacío)</span>}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Instrucción de qué hacer */}
            {analizarColumnas(COLUMNAS_REQUERIDAS[plataforma], preview.columnasDetectadas ?? []).some(
              (r) => !r.encontrada
            ) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800">
                <p className="font-medium mb-1">¿Qué hacer?</p>
                <p className="text-xs">
                  Envíame una captura de pantalla de las columnas que ves arriba (o cópiame los nombres exactos)
                  y ajusto el parser para que lea tu archivo correctamente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview de transacciones */}
      {preview && estado === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen del archivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{preview.total}</p>
                <p className="text-xs text-blue-600">Transacciones</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{preview.nuevas}</p>
                <p className="text-xs text-green-600">Nuevas</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-500">{preview.duplicadas}</p>
                <p className="text-xs text-gray-500">Ya importadas</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-indigo-700">{formatUSD(preview.totalUSD)}</p>
                <p className="text-xs text-indigo-600">Total USD</p>
              </div>
            </div>

            {/* Tabla mensual */}
            {preview.resumenMensual.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Desglose por mes</p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-500 text-left">
                        <th className="px-4 py-2 font-medium">Mes</th>
                        <th className="px-4 py-2 font-medium text-right">Ventas</th>
                        <th className="px-4 py-2 font-medium text-right">Facturación bruta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.resumenMensual.map((m) => (
                        <tr key={m.mes} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2 capitalize">{m.label}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{m.cantidad}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatUSD(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t font-bold">
                        <td className="px-4 py-2">Total</td>
                        <td className="px-4 py-2 text-right">{preview.total}</td>
                        <td className="px-4 py-2 text-right text-indigo-700">{formatUSD(preview.totalUSD)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Advertencias */}
            {preview.erroresParseo.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm max-h-32 overflow-y-auto">
                <p className="font-medium text-yellow-800 mb-1">
                  {preview.total === 0
                    ? "⚠️ No se encontraron transacciones. Usa \"Ver diagnóstico\" para revisar las columnas."
                    : `${preview.erroresParseo.length} filas omitidas:`}
                </p>
                {preview.total > 0 && preview.erroresParseo.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-yellow-700 text-xs">{e}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {estado === "confirmado" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          {mensaje}
        </div>
      )}
      {estado === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          ❌ {mensaje}
        </div>
      )}
    </div>
  );
}
