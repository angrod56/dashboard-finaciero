import * as XLSX from "xlsx";
import { createHash } from "crypto";
import type { TransaccionNormalizada, Categoria } from "@/types";
import { convertirAUSD } from "../divisas";

// Palabras clave para inferir categoría desde la descripción
const PATRONES_CATEGORIA: Array<{ patron: RegExp; categoria: Categoria }> = [
  { patron: /mentor|coaching|1:1|acompañ/i, categoria: "mentoria" },
  { patron: /members|membresia|suscri|club/i, categoria: "membresia" },
  { patron: /servicio|consul|agencia|freelance/i, categoria: "servicio" },
  { patron: /curso|producto|digital|ebook|template/i, categoria: "producto_digital" },
];

function inferirCategoria(descripcion: string): Categoria {
  for (const { patron, categoria } of PATRONES_CATEGORIA) {
    if (patron.test(descripcion)) return categoria;
  }
  return "producto_digital";
}

function generarIdEstable(fecha: string, descripcion: string, monto: number): string {
  const contenido = `bancolombia::${fecha}::${descripcion}::${monto}`;
  return createHash("md5").update(contenido).digest("hex").slice(0, 16);
}

function parsearFechaBancolombia(valor: unknown): Date {
  if (!valor) return new Date();
  const str = String(valor).trim();
  // Formato DD/MM/YYYY
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dia, mes, anio] = match;
    return new Date(`${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T00:00:00Z`);
  }
  // Número de serie Excel (días desde 1900-01-01)
  if (/^\d+$/.test(str)) {
    const fecha = XLSX.SSF.parse_date_code(parseInt(str));
    if (fecha) {
      return new Date(
        Date.UTC(fecha.y, fecha.m - 1, fecha.d)
      );
    }
  }
  return new Date(str);
}

function parsearMontoBancolombia(valor: unknown): number {
  if (!valor) return 0;
  const str = String(valor).replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  return parseFloat(str) || 0;
}

export async function parsearBancolombia(
  buffer: ArrayBuffer
): Promise<{ transacciones: TransaccionNormalizada[]; errores: string[] }> {
  const errores: string[] = [];
  const transacciones: TransaccionNormalizada[] = [];

  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, {
    header: 1,
    defval: "",
  }) as unknown[][];

  // Encontrar la fila de encabezado buscando "Fecha" en cualquier celda
  let filaEncabezado = -1;
  for (let i = 0; i < Math.min(filas.length, 30); i++) {
    const fila = filas[i];
    const tieneFecha = fila.some(
      (c) => String(c).toLowerCase().includes("fecha")
    );
    if (tieneFecha) {
      filaEncabezado = i;
      break;
    }
  }

  if (filaEncabezado === -1) {
    errores.push("No se encontró la fila de encabezado en el archivo de Bancolombia");
    return { transacciones, errores };
  }

  const encabezados = filas[filaEncabezado].map((c) => String(c).trim().toLowerCase());
  const iDate = encabezados.findIndex((h) => h.includes("fecha"));
  const iDesc = encabezados.findIndex((h) => h.includes("descrip") || h.includes("concepto"));
  const iCredito = encabezados.findIndex((h) => h.includes("crédito") || h.includes("credito") || h.includes("abono"));
  const iDebito = encabezados.findIndex((h) => h.includes("débito") || h.includes("debito") || h.includes("cargo"));
  const iTxId = encabezados.findIndex((h) => h.includes("transacc") || h.includes("referencia") || h.includes("número"));

  if (iDate === -1 || iDesc === -1 || iCredito === -1) {
    errores.push(`Columnas requeridas no encontradas. Encabezados detectados: ${encabezados.join(", ")}`);
    return { transacciones, errores };
  }

  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || fila.length === 0) continue;

    try {
      const credito = parsearMontoBancolombia(fila[iCredito]);
      const debito = iDebito !== -1 ? parsearMontoBancolombia(fila[iDebito]) : 0;

      // Solo procesar créditos (ingresos), ignorar débitos
      if (!credito || debito > 0) continue;

      const descripcion = String(fila[iDesc] || "Transferencia Bancolombia").trim();
      const fechaTransaccion = parsearFechaBancolombia(fila[iDate]);
      const fechaStr = String(fila[iDate]).trim();

      let txId: string;
      if (iTxId !== -1 && fila[iTxId]) {
        txId = String(fila[iTxId]).trim();
      } else {
        txId = generarIdEstable(fechaStr, descripcion, credito);
      }

      const { montoUSD, tasaCambio } = await convertirAUSD(
        credito,
        "COP",
        fechaTransaccion
      );

      transacciones.push({
        plataforma: "bancolombia",
        plataformaTxId: txId,
        montoUSD,
        montoOriginal: credito,
        moneda: "COP",
        tasaCambio,
        categoria: inferirCategoria(descripcion),
        nombreProducto: descripcion.slice(0, 200),
        estado: "completado",
        fechaTransaccion,
        fuente: "importacion",
      });
    } catch (e) {
      errores.push(`Fila ${i + 1}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return { transacciones, errores };
}
