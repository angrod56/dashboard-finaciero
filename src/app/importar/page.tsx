"use client";

import { useState } from "react";
import { ZonaImportacion } from "@/components/importar/ZonaImportacion";
import { HistorialImports } from "@/components/importar/HistorialImports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportarPage() {
  const [contadorRecargar, setContadorRecargar] = useState(0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar datos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Sube archivos CSV o Excel de Hotmart, Stripe o Bancolombia. Los duplicados se omiten automáticamente.
        </p>
      </div>

      {/* Instrucciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: "🔥",
            titulo: "Hotmart",
            pasos: "Ve a Financiero → Transacciones → Exportar CSV",
          },
          {
            icon: "💳",
            titulo: "Stripe",
            pasos: "Dashboard → Payments → Export → All columns",
          },
          {
            icon: "🏦",
            titulo: "Bancolombia",
            pasos: "App → Cuenta → Movimientos → Descargar Excel",
          },
        ].map((p) => (
          <Card key={p.titulo} className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {p.icon} {p.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">{p.pasos}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Zona de importación */}
      <Card>
        <CardHeader>
          <CardTitle>Subir archivo</CardTitle>
        </CardHeader>
        <CardContent>
          <ZonaImportacion
            onImportado={() => setContadorRecargar((c) => c + 1)}
          />
        </CardContent>
      </Card>

      {/* Historial */}
      <HistorialImports recargar={contadorRecargar} />
    </div>
  );
}
