"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Batch {
  id: string;
  plataforma: string;
  nombreArchivo: string;
  totalFilas: number;
  filasInsertadas: number;
  filasOmitidas: number;
  filasError: number;
  creadoEn: string;
}

const COLORES: Record<string, string> = {
  hotmart: "bg-orange-100 text-orange-800",
  stripe: "bg-indigo-100 text-indigo-800",
  bancolombia: "bg-green-100 text-green-800",
};

export function HistorialImports({ recargar }: { recargar?: number }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [cargando, setCargando] = useState(true);
  const [borrando, setBorrando] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    fetch("/api/importar")
      .then((r) => r.json())
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [recargar]);

  const borrarBatch = async (id: string, nombre: string) => {
    if (!confirm(`¿Borrar la importación "${nombre}" y todas sus transacciones?`)) return;
    setBorrando(id);
    try {
      await fetch(`/api/importar?batchId=${id}`, { method: "DELETE" });
      cargar();
    } finally {
      setBorrando(null);
    }
  };

  const borrarTodo = async () => {
    if (!confirm("¿Borrar TODOS los datos importados? Esta acción no se puede deshacer.")) return;
    setBorrando("todo");
    try {
      await fetch("/api/importar?todo=true", { method: "DELETE" });
      cargar();
    } finally {
      setBorrando(null);
    }
  };

  if (cargando) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Historial de importaciones</CardTitle>
        {batches.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={borrarTodo}
            disabled={borrando === "todo"}
            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
          >
            {borrando === "todo" ? "Borrando..." : "🗑 Borrar todo"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            No hay importaciones previas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Plataforma</th>
                  <th className="pb-2 font-medium">Archivo</th>
                  <th className="pb-2 font-medium text-right">Insertadas</th>
                  <th className="pb-2 font-medium text-right">Omitidas</th>
                  <th className="pb-2 font-medium text-right">Errores</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 text-gray-500">
                      {new Date(b.creadoEn).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2">
                      <Badge className={COLORES[b.plataforma] ?? "bg-gray-100 text-gray-800"}>
                        {b.plataforma}
                      </Badge>
                    </td>
                    <td className="py-2 max-w-[200px] truncate text-gray-600">{b.nombreArchivo}</td>
                    <td className="py-2 text-right font-medium text-green-600">{b.filasInsertadas}</td>
                    <td className="py-2 text-right text-gray-400">{b.filasOmitidas}</td>
                    <td className="py-2 text-right text-red-500">{b.filasError}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => borrarBatch(b.id, b.nombreArchivo)}
                        disabled={borrando === b.id}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40 px-1"
                        title="Borrar esta importación y sus transacciones"
                      >
                        {borrando === b.id ? "..." : "🗑"}
                      </button>
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
