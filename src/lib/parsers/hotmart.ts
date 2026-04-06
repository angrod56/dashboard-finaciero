import Papa from "papaparse";
import { createHash } from "crypto";
import type { TransaccionNormalizada, Categoria } from "@/types";

const ESTADOS: Record<string, TransaccionNormalizada["estado"]> = {
  APPROVED: "completado",
  COMPLETE: "completado",
  COMPLETED: "completado",
  APPROVED_CHARGEBACK: "contracargo",
  CHARGEBACK: "contracargo",
  REFUNDED: "reembolsado",
  REEMBOLSO: "reembolsado",
  CANCELADO: "reembolsado",
  CANCELLED: "reembolsado",
  CANCELADA: "reembolsado",
};

function inferirCategoria(nombre: string): Categoria {
  const n = nombre.toLowerCase();
  if (n.includes("mentor") || n.includes("coaching") || n.includes("1:1") || n.includes("acompañ")) return "mentoria";
  if (n.includes("members") || n.includes("membresia") || n.includes("suscri") || n.includes("club")) return "membresia";
  if (n.includes("servicio") || n.includes("consul") || n.includes("agencia") || n.includes("freelance")) return "servicio";
  return "producto_digital";
}

function parsearMonto(valor: string): number {
  if (!valor) return 0;
  // Quitar símbolos de moneda y espacios
  let s = valor.replace(/[^0-9.,\-]/g, "").trim();
  if (!s) return 0;

  const tienePunto = s.includes(".");
  const tieneDecimalComa = s.includes(",");

  if (tienePunto && tieneDecimalComa) {
    // Determinar cuál es decimal: el último separador es el decimal
    const ultimoPunto = s.lastIndexOf(".");
    const ultimaComa = s.lastIndexOf(",");
    if (ultimaComa > ultimoPunto) {
      // Formato europeo: 1.234,56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato americano: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (tieneDecimalComa && !tienePunto) {
    // Solo comas: puede ser 1,234 (miles) o 1,23 (decimal)
    const partesComa = s.split(",");
    if (partesComa.length === 2 && partesComa[1].length <= 2) {
      // Decimal: 1,23 → 1.23
      s = s.replace(",", ".");
    } else {
      // Miles: 1,234 → 1234
      s = s.replace(/,/g, "");
    }
  }
  // Si solo tiene puntos: puede ser 1.234 (europeo miles) o 1.23 (decimal)
  else if (tienePunto && !tieneDecimalComa) {
    const partesPunto = s.split(".");
    if (partesPunto.length === 2 && partesPunto[1].length === 3) {
      // Probablemente miles europeo: 1.234 → 1234
      s = s.replace(".", "");
    }
    // Si tiene decimales normales (1.23), dejar como está
  }

  return parseFloat(s) || 0;
}

function parsearFecha(valor: string): Date {
  if (!valor) return new Date();
  const partes = valor.trim().split(" ")[0].split("/");
  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return new Date(`${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T00:00:00Z`);
  }
  return new Date(valor);
}

/** Genera un ID estable a partir del contenido de la fila */
function idEstable(plataforma: string, fila: Record<string, string>): string {
  const contenido = `${plataforma}::${JSON.stringify(Object.values(fila))}`;
  return createHash("md5").update(contenido).digest("hex").slice(0, 20);
}

/** Devuelve true si el string parece un monto monetario realista (no un ID) */
function pareceMontoValido(valor: string): boolean {
  const limpio = valor.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const num = parseFloat(limpio);
  if (isNaN(num) || num <= 0) return false;
  // Rechazar enteros muy grandes sin decimales (probablemente IDs)
  if (Number.isInteger(num) && num > 1_000_000) return false;
  // Aceptar valores con decimales o valores enteros razonables (< 1 millón)
  return true;
}

/** Busca el monto en la fila usando la lista de columnas conocidas como prioridad */
function buscarMonto(fila: Record<string, string>): { valor: string; columna: string } {
  // Columnas con nombre exacto: se usan directamente si tienen cualquier número > 0
  const prioridad = [
    "Facturación bruta",
    "Facturacion bruta",
    "Valor que has recibido convertido",
    "Valor Líquido", "Net Value", "Valor Neto", "price_value",
    "Valor Bruto", "Gross Value",
    "Valor", "Value", "Monto", "Amount", "Total", "Receita",
    "Comissão", "Commission", "Precio", "Price", "Ingreso", "Revenue",
  ];
  for (const col of prioridad) {
    const num = parsearMonto(fila[col] ?? "");
    if (num > 0) return { valor: fila[col], columna: col };
  }
  // Fallback: columna cuyo nombre sugiera dinero y el valor NO parezca un ID largo sin decimales
  for (const [col, val] of Object.entries(fila)) {
    const colLower = col.toLowerCase();
    const esColumnaDinero =
      colLower.includes("valor") || colLower.includes("monto") ||
      colLower.includes("amount") || colLower.includes("price") ||
      colLower.includes("total") || colLower.includes("ingreso") ||
      colLower.includes("receita") || colLower.includes("comis");
    if (esColumnaDinero && pareceMontoValido(val)) return { valor: val, columna: col };
  }
  return { valor: "0", columna: "" };
}

/** Busca la fecha en el primer campo que parezca una fecha */
function buscarFecha(fila: Record<string, string>): string {
  const prioridad = [
    "Data Compra", "Purchase Date", "Fecha Compra", "purchase_date",
    "Data", "Date", "Fecha", "Created", "Created date (UTC)",
    "Data Aprovação", "Approval Date",
  ];
  for (const col of prioridad) {
    if (fila[col]?.trim()) return fila[col];
  }
  // Fallback: primer campo que tenga formato de fecha
  for (const val of Object.values(fila)) {
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(val)) return val;
    if (/\d{4}-\d{2}-\d{2}/.test(val)) return val;
  }
  return "";
}

/** Busca el nombre del producto */
function buscarProducto(fila: Record<string, string>): string {
  const prioridad = [
    "Produto", "Product", "Producto", "product_name",
    "Nome do Produto", "Descripción", "Description",
    // "Nombre" excluido — en exports de Hotmart suele ser el nombre del comprador
  ];
  for (const col of prioridad) {
    if (fila[col]?.trim()) return fila[col].trim();
  }
  return "Producto Hotmart";
}

/** Busca el email del comprador */
function buscarEmailComprador(fila: Record<string, string>): string | undefined {
  const prioridad = [
    "Email do Comprador", "Email del Comprador", "Buyer Email",
    "email_buyer", "Email comprador", "Email",
    "Correo", "Correo electrónico", "E-mail", "email",
  ];
  for (const col of prioridad) {
    const val = fila[col]?.trim().toLowerCase();
    if (val && val.includes("@")) return val;
  }
  return undefined;
}

/** Busca el nombre del comprador */
function buscarNombreComprador(fila: Record<string, string>): string | undefined {
  const prioridad = [
    "Nome do Comprador", "Nombre del Comprador", "Buyer Name",
    "name_buyer", "Nome", "Nombre Comprador",
    "Nombre", // columna genérica de nombre en exports de Hotmart en español
  ];
  for (const col of prioridad) {
    const val = fila[col]?.trim();
    if (val) return val;
  }
  return undefined;
}

/** Busca la divisa — por defecto USD */
function buscarMoneda(fila: Record<string, string>): string {
  const prioridad = ["Moeda", "Currency", "Moneda", "Divisa", "Moneda de la cuenta"];
  for (const col of prioridad) {
    const val = fila[col]?.trim().toUpperCase();
    if (val === "USD" || val === "BRL" || val === "EUR" || val === "COP") return val;
  }
  return "USD"; // Hotmart paga comisiones en USD por defecto
}

export async function parsearHotmart(
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
      // ID: buscar en columnas conocidas, si no, generar uno estable
      const txId =
        fila["Cod. Transação"]?.trim() ||
        fila["Transaction Code"]?.trim() ||
        fila["Código de Transacción"]?.trim() ||
        fila["cod_transaction"]?.trim() ||
        fila["transaction_code"]?.trim() ||
        fila["Ref."]?.trim() ||
        fila["Referência"]?.trim() ||
        fila["Reference"]?.trim() ||
        idEstable("hotmart", fila);

      const moneda = buscarMoneda(fila);

      // Solo importar transacciones en USD
      if (moneda !== "USD") continue;

      const { valor: montoStr } = buscarMonto(fila);
      const montoOriginal = parsearMonto(montoStr);

      // Saltar filas con monto 0
      if (montoOriginal === 0) continue;

      const fechaStr = buscarFecha(fila);
      const nombreProducto = buscarProducto(fila);

      const estadoStr = (fila["Status"] || fila["Estado"] || fila["Situação"] || "APPROVED").toUpperCase();
      const estado = ESTADOS[estadoStr] ?? "completado";

      const fechaTransaccion = parsearFecha(fechaStr);
      // Moneda ya es USD, conversión directa sin lookup de tasas
      const montoUSD = montoOriginal;
      const tasaCambio = 1.0;

      transacciones.push({
        plataforma: "hotmart",
        plataformaTxId: txId,
        montoUSD,
        montoOriginal,
        moneda,
        tasaCambio,
        categoria: inferirCategoria(nombreProducto),
        nombreProducto,
        estado,
        fechaTransaccion,
        fuente: "importacion",
        compradorEmail: buscarEmailComprador(fila),
        compradorNombre: buscarNombreComprador(fila),
      });
    } catch (e) {
      errores.push(`Fila ${idx + 2}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return { transacciones, errores };
}
