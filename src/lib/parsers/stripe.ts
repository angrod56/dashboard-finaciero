import Papa from "papaparse";
import { createHash } from "crypto";
import type { TransaccionNormalizada, Categoria } from "@/types";
import { convertirAUSD } from "../divisas";

const ESTADOS: Record<string, TransaccionNormalizada["estado"]> = {
  succeeded: "completado",
  paid: "completado",
  complete: "completado",
  completed: "completado",
  refunded: "reembolsado",
  failed: "reembolsado",
  disputed: "contracargo",
};

function inferirCategoria(descripcion: string): Categoria {
  const d = descripcion.toLowerCase();
  if (d.includes("mentor") || d.includes("coaching") || d.includes("1:1")) return "mentoria";
  if (d.includes("members") || d.includes("suscri") || d.includes("subscription") || d.includes("recurring")) return "membresia";
  if (d.includes("servicio") || d.includes("service") || d.includes("consul")) return "servicio";
  return "producto_digital";
}

function idEstable(fila: Record<string, string>): string {
  const contenido = `stripe::${JSON.stringify(Object.values(fila))}`;
  return createHash("md5").update(contenido).digest("hex").slice(0, 20);
}

function parsearMontoStripe(valor: string): number {
  if (!valor) return 0;
  // Stripe puede exportar con formato 1,234.56 o 1234.56 o 1234 (centavos)
  // Limpiar separadores de miles
  const limpio = valor.replace(/,(?=\d{3})/g, "").replace(/[^0-9.-]/g, "");
  const num = parseFloat(limpio) || 0;
  return num;
}

function buscarCampo(fila: Record<string, string>, candidatos: string[]): string {
  for (const c of candidatos) {
    if (fila[c]?.trim()) return fila[c].trim();
  }
  return "";
}

export async function parsearStripe(
  contenido: string
): Promise<{ transacciones: TransaccionNormalizada[]; errores: string[] }> {
  const errores: string[] = [];
  const transacciones: TransaccionNormalizada[] = [];

  const csv = contenido.replace(/^\uFEFF/, "");

  const resultado = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  for (let idx = 0; idx < resultado.data.length; idx++) {
    const fila = resultado.data[idx];
    try {
      const txId =
        fila["id"]?.trim() ||
        fila["payment_intent_id"]?.trim() ||
        fila["charge_id"]?.trim() ||
        fila["ID"]?.trim() ||
        idEstable(fila);

      const montoStr = buscarCampo(fila, [
        "amount", "Amount", "net", "Net", "gross", "Gross",
        "amount_captured", "converted_amount",
      ]);
      const montoOriginal = parsearMontoStripe(montoStr);

      if (montoOriginal === 0) continue;

      const estadoStr = buscarCampo(fila, ["status", "Status"]).toLowerCase();
      const estado = ESTADOS[estadoStr] ?? "completado";

      const moneda = (buscarCampo(fila, ["currency", "Currency"]) || "usd").toUpperCase();

      const fechaStr = buscarCampo(fila, [
        "created", "Created date (UTC)", "Created (UTC)", "Date",
        "created_at", "payment_date",
      ]);
      let fechaTransaccion: Date;
      if (/^\d{10}$/.test(fechaStr.trim())) {
        fechaTransaccion = new Date(parseInt(fechaStr) * 1000);
      } else {
        fechaTransaccion = fechaStr ? new Date(fechaStr) : new Date();
      }

      const descripcion = buscarCampo(fila, [
        "description", "Description", "statement_descriptor",
        "product_description", "name",
      ]) || "Stripe Payment";

      const { montoUSD, tasaCambio } = await convertirAUSD(montoOriginal, moneda, fechaTransaccion);

      const compradorEmail = buscarCampo(fila, [
        "customer_email", "Customer Email", "email", "Email",
        "receipt_email", "billing_email",
      ]).toLowerCase() || undefined;
      const compradorNombre = buscarCampo(fila, [
        "customer_name", "Customer Name", "customer_description",
        "billing_name", "name",
      ]) || undefined;

      transacciones.push({
        plataforma: "stripe",
        plataformaTxId: txId,
        montoUSD,
        montoOriginal,
        moneda,
        tasaCambio,
        categoria: inferirCategoria(descripcion),
        nombreProducto: descripcion.slice(0, 200),
        estado,
        fechaTransaccion,
        fuente: "importacion",
        compradorEmail: compradorEmail && compradorEmail.includes("@") ? compradorEmail : undefined,
        compradorNombre,
      });
    } catch (e) {
      errores.push(`Fila ${idx + 2}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return { transacciones, errores };
}
