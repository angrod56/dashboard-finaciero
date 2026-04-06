import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parsearHotmart } from "@/lib/parsers/hotmart";
import { parsearStripe } from "@/lib/parsers/stripe";
import { parsearBancolombia } from "@/lib/parsers/bancolombia";
import { upsertTransaccion, verificarDuplicados } from "@/lib/importers/upsertTransaccion";
import type { Plataforma } from "@/types";

function detectarColumnasDesdeTexto(csv: string): { columnas: string[]; filaEjemplo: Record<string, string> } {
  const resultado = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    preview: 2,
  });
  return {
    columnas: resultado.meta.fields ?? [],
    filaEjemplo: resultado.data[0] ?? {},
  };
}

function detectarColumnasDesdeBuffer(buffer: ArrayBuffer): { columnas: string[]; filaEjemplo: Record<string, string> } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" }) as unknown[][];

  for (let i = 0; i < Math.min(filas.length, 30); i++) {
    const fila = filas[i] as unknown[];
    if (fila.some((c) => String(c).toLowerCase().includes("fecha"))) {
      const columnas = fila.map((c) => String(c).trim()).filter(Boolean);
      const ejemplo: Record<string, string> = {};
      if (filas[i + 1]) {
        columnas.forEach((col, j) => {
          ejemplo[col] = String((filas[i + 1] as unknown[])[j] ?? "").trim();
        });
      }
      return { columnas, filaEjemplo: ejemplo };
    }
  }
  return { columnas: [], filaEjemplo: {} };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const archivo = formData.get("archivo") as File | null;
    const plataforma = formData.get("plataforma") as Plataforma | null;
    const modo = formData.get("modo") as string | null;

    if (!archivo || !plataforma) {
      return NextResponse.json({ error: "Se requiere archivo y plataforma" }, { status: 400 });
    }

    const plataformasValidas: Plataforma[] = ["hotmart", "stripe", "bancolombia"];
    if (!plataformasValidas.includes(plataforma)) {
      return NextResponse.json({ error: "Plataforma no válida" }, { status: 400 });
    }

    // Leer el contenido del archivo UNA sola vez
    let textoCSV = "";
    let bufferExcel: ArrayBuffer | null = null;

    if (plataforma === "bancolombia") {
      bufferExcel = await archivo.arrayBuffer();
    } else {
      textoCSV = await archivo.text();
      // Limpiar BOM
      textoCSV = textoCSV.replace(/^\uFEFF/, "");
    }

    // Modo diagnóstico
    if (modo === "diagnostico") {
      const info = plataforma === "bancolombia"
        ? detectarColumnasDesdeBuffer(bufferExcel!)
        : detectarColumnasDesdeTexto(textoCSV);
      return NextResponse.json(info);
    }

    // Parsear transacciones
    let transacciones: Awaited<ReturnType<typeof parsearHotmart>>["transacciones"] = [];
    let erroresParseo: string[] = [];

    if (plataforma === "bancolombia") {
      const resultado = await parsearBancolombia(bufferExcel!);
      transacciones = resultado.transacciones;
      erroresParseo = resultado.errores;
    } else if (plataforma === "hotmart") {
      const resultado = await parsearHotmart(textoCSV);
      transacciones = resultado.transacciones;
      erroresParseo = resultado.errores;
    } else {
      const resultado = await parsearStripe(textoCSV);
      transacciones = resultado.transacciones;
      erroresParseo = resultado.errores;
    }

    // Extraer columnas del archivo ya leído (sin releer)
    const { columnas: columnasDetectadas, filaEjemplo } = plataforma === "bancolombia"
      ? detectarColumnasDesdeBuffer(bufferExcel!)
      : detectarColumnasDesdeTexto(textoCSV);

    // Modo preview
    if (modo === "preview") {
      const duplicados = await verificarDuplicados(
        transacciones.map((t) => ({ plataforma: t.plataforma, plataformaTxId: t.plataformaTxId }))
      );

      // Resumen por mes
      const porMes: Record<string, { mes: string; label: string; cantidad: number; total: number }> = {};
      for (const t of transacciones) {
        const fecha = new Date(t.fechaTransaccion);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        if (!porMes[key]) {
          porMes[key] = {
            mes: key,
            label: fecha.toLocaleDateString("es-CO", { month: "long", year: "numeric" }),
            cantidad: 0,
            total: 0,
          };
        }
        porMes[key].cantidad++;
        porMes[key].total += t.montoUSD;
      }
      const resumenMensual = Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes));

      return NextResponse.json({
        total: transacciones.length,
        nuevas: transacciones.length - duplicados.size,
        duplicadas: duplicados.size,
        totalUSD: transacciones.reduce((s, t) => s + t.montoUSD, 0),
        erroresParseo: erroresParseo.slice(0, 20),
        columnasDetectadas,
        filaEjemplo,
        resumenMensual,
        preview: transacciones.slice(0, 5).map((t) => ({
          fecha: t.fechaTransaccion,
          producto: t.nombreProducto,
          montoOriginal: t.montoOriginal,
          moneda: t.moneda,
          montoUSD: t.montoUSD,
          estado: t.estado,
          esDuplicada: duplicados.has(`${t.plataforma}::${t.plataformaTxId}`),
        })),
      });
    }

    // Modo confirmar
    const batch = await prisma.importBatch.create({
      data: {
        plataforma,
        nombreArchivo: archivo.name,
        totalFilas: transacciones.length,
        filasInsertadas: 0,
        filasOmitidas: 0,
        filasError: erroresParseo.length,
      },
    });

    let insertadas = 0;
    let omitidas = 0;
    let errores = erroresParseo.length;

    for (const tx of transacciones) {
      try {
        const resultado = await upsertTransaccion(tx, batch.id);
        if (resultado.accion === "insertada" || resultado.accion === "actualizada") {
          insertadas++;
        } else {
          omitidas++;
        }
      } catch {
        errores++;
      }
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { filasInsertadas: insertadas, filasOmitidas: omitidas, filasError: errores },
    });

    return NextResponse.json({ exito: true, insertadas, omitidas, errores, batchId: batch.id });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error("Error en /api/importar:", mensaje);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

export async function GET() {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { creadoEn: "desc" },
      take: 20,
    });
    return NextResponse.json(batches);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const todo = searchParams.get("todo"); // "true" = borrar todo

    if (todo === "true") {
      // Borrar TODAS las transacciones y batches
      await prisma.transaccion.deleteMany({});
      await prisma.importBatch.deleteMany({});
      return NextResponse.json({ ok: true, mensaje: "Todos los datos borrados" });
    }

    if (!batchId) {
      return NextResponse.json({ error: "Se requiere batchId" }, { status: 400 });
    }

    // Borrar las transacciones de ese batch y luego el batch
    await prisma.transaccion.deleteMany({ where: { importBatchId: batchId } });
    await prisma.importBatch.delete({ where: { id: batchId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
