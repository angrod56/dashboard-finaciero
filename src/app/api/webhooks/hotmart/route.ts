import { NextRequest, NextResponse } from "next/server";
import { upsertTransaccion } from "@/lib/importers/upsertTransaccion";
import { convertirAUSD } from "@/lib/divisas";
import type { Categoria } from "@/types";

const EVENTOS_PROCESADOS = new Set([
  "PURCHASE_COMPLETE",
  "PURCHASE_APPROVED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
]);

function inferirCategoria(nombre: string): Categoria {
  const n = nombre.toLowerCase();
  if (n.includes("mentor") || n.includes("coaching")) return "mentoria";
  if (n.includes("members") || n.includes("suscri")) return "membresia";
  if (n.includes("servicio") || n.includes("consul")) return "servicio";
  return "producto_digital";
}

export async function POST(request: NextRequest) {
  try {
    // Hotmart envía hottok como header O como query param
    const { searchParams } = new URL(request.url);
    const hottok = request.headers.get("hottok") ?? searchParams.get("hottok");
    const tokenEsperado = process.env.HOTMART_WEBHOOK_TOKEN;

    console.log("Webhook Hotmart recibido — hottok:", hottok, "esperado:", tokenEsperado);

    if (tokenEsperado && tokenEsperado !== "tu_token_de_hotmart_aqui" && hottok !== tokenEsperado) {
      console.warn("Webhook Hotmart: token inválido");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await request.json();
    const evento = payload?.event as string;

    console.log("Webhook Hotmart evento:", evento, "payload keys:", Object.keys(payload?.data ?? {}));
    console.log("Webhook Hotmart commissions:", JSON.stringify(payload?.data?.commissions));
    console.log("Webhook Hotmart purchase.price:", JSON.stringify(payload?.data?.purchase?.price));

    // Siempre responder 200 a Hotmart para evitar reintentos innecesarios
    if (!EVENTOS_PROCESADOS.has(evento)) {
      console.log("Webhook Hotmart: evento no procesado:", evento);
      return NextResponse.json({ recibido: true, procesado: false });
    }

    const compra = payload?.data?.purchase;
    if (!compra) {
      return NextResponse.json({ recibido: true, procesado: false });
    }

    const txId = compra.transaction as string;
    if (!txId) {
      return NextResponse.json({ recibido: true, procesado: false });
    }

    // Buscar la comisión correcta según el rol configurado
    // HOTMART_COMMISSION_SOURCE puede ser: PRODUCER, COPRODUCER, AFFILIATE
    // Si no está configurado, busca cualquier entrada que no sea MARKETPLACE
    const commissions = payload?.data?.commissions as Array<{ source: string; value: number; currency_value: string }> | undefined;
    const miSource = process.env.HOTMART_COMMISSION_SOURCE ?? "PRODUCER";
    const miComision = commissions?.find((c) => c.source === miSource)
      ?? commissions?.find((c) => c.source !== "MARKETPLACE");

    const montoOriginal = miComision ? miComision.value : parseFloat(compra.price?.value ?? 0);
    const moneda = (miComision ? miComision.currency_value : (compra.price?.currency_value ?? "USD")).toUpperCase();
    console.log("Webhook Hotmart monto seleccionado:", montoOriginal, moneda, "source:", miComision?.source ?? "precio_total");
    const nombreProducto = payload?.data?.product?.name ?? "Producto Hotmart";
    const fechaTransaccion = compra.approved_date
      ? new Date(compra.approved_date)
      : new Date();

    const estado =
      evento === "PURCHASE_REFUNDED"
        ? "reembolsado"
        : evento === "PURCHASE_CHARGEBACK"
        ? "contracargo"
        : "completado";

    const { montoUSD, tasaCambio } = await convertirAUSD(
      montoOriginal,
      moneda,
      fechaTransaccion
    );

    const comprador = payload?.data?.buyer;
    const compradorEmail = (comprador?.email as string | undefined)?.toLowerCase() || undefined;
    const compradorNombre = (comprador?.name as string | undefined) || undefined;

    await upsertTransaccion({
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
      fuente: "webhook",
      compradorEmail,
      compradorNombre,
      payloadRaw: JSON.stringify(payload),
    });

    return NextResponse.json({ recibido: true, procesado: true });
  } catch (error) {
    console.error("Error en webhook Hotmart:", error);
    // Devolver 200 para que Hotmart no reintente con un payload inválido
    return NextResponse.json({ recibido: true, error: true });
  }
}
