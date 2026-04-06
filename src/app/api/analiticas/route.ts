import { NextRequest, NextResponse } from "next/server";
import { obtenerDatosMensuales, calcularKPIs, calcularLTV } from "@/lib/analiticas";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vista = searchParams.get("vista") || "mensual";
    const meses = parseInt(searchParams.get("meses") || "24");

    if (vista === "kpis") {
      const kpis = await calcularKPIs();
      return NextResponse.json(kpis);
    }

    if (vista === "mensual") {
      const datos = await obtenerDatosMensuales(meses);
      return NextResponse.json(datos);
    }

    if (vista === "ltv") {
      const datos = await calcularLTV();
      return NextResponse.json(datos);
    }

    return NextResponse.json({ error: "Vista no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error en /api/analiticas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
