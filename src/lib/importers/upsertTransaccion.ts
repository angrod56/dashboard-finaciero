import { prisma } from "../db";
import type { TransaccionNormalizada } from "@/types";

export interface ResultadoUpsert {
  accion: "insertada" | "omitida" | "actualizada";
  id: string;
}

/**
 * Inserta una transacción si no existe.
 * Si ya existe (mismo plataforma + plataformaTxId), solo actualiza el estado
 * (útil para registrar reembolsos que llegan después).
 */
export async function upsertTransaccion(
  data: TransaccionNormalizada,
  importBatchId?: string
): Promise<ResultadoUpsert> {
  const existente = await prisma.transaccion.findUnique({
    where: {
      plataforma_plataformaTxId: {
        plataforma: data.plataforma,
        plataformaTxId: data.plataformaTxId,
      },
    },
  });

  if (existente) {
    // Solo actualizar estado si cambió (ej: de "completado" a "reembolsado")
    if (existente.estado !== data.estado) {
      const actualizada = await prisma.transaccion.update({
        where: { id: existente.id },
        data: { estado: data.estado, actualizadoEn: new Date() },
      });
      return { accion: "actualizada", id: actualizada.id };
    }
    return { accion: "omitida", id: existente.id };
  }

  const nueva = await prisma.transaccion.create({
    data: {
      plataforma: data.plataforma,
      plataformaTxId: data.plataformaTxId,
      montoUSD: data.montoUSD,
      montoOriginal: data.montoOriginal,
      moneda: data.moneda,
      tasaCambio: data.tasaCambio,
      categoria: data.categoria,
      nombreProducto: data.nombreProducto,
      estado: data.estado,
      fechaTransaccion: data.fechaTransaccion,
      fuente: data.fuente,
      compradorEmail: data.compradorEmail ?? null,
      compradorNombre: data.compradorNombre ?? null,
      importBatchId: importBatchId ?? null,
      payloadRaw: data.payloadRaw ?? null,
    },
  });

  return { accion: "insertada", id: nueva.id };
}

/**
 * Verifica cuáles transacciones de un lote ya existen en la DB.
 * Útil para el dry-run del preview de importación.
 */
export async function verificarDuplicados(
  items: Array<{ plataforma: string; plataformaTxId: string }>
): Promise<Set<string>> {
  if (items.length === 0) return new Set();

  const resultado = new Set<string>();
  const LOTE = 200; // SQLite soporta hasta ~999 parámetros; 200 condiciones × 2 campos = seguro

  for (let i = 0; i < items.length; i += LOTE) {
    const lote = items.slice(i, i + LOTE);
    const existentes = await prisma.transaccion.findMany({
      where: {
        OR: lote.map((item) => ({
          plataforma: item.plataforma,
          plataformaTxId: item.plataformaTxId,
        })),
      },
      select: { plataforma: true, plataformaTxId: true },
    });
    existentes.forEach((e) => resultado.add(`${e.plataforma}::${e.plataformaTxId}`));
  }

  return resultado;
}
