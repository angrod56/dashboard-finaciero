import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertTransaccion } from "@/lib/importers/upsertTransaccion";
import { convertirAUSD } from "@/lib/divisas";
import type { Categoria } from "@/types";

function inferirCategoria(descripcion: string): Categoria {
  const d = (descripcion ?? "").toLowerCase();
  if (d.includes("mentor") || d.includes("coaching")) return "mentoria";
  if (d.includes("members") || d.includes("suscri") || d.includes("subscription")) return "membresia";
  if (d.includes("servicio") || d.includes("service") || d.includes("consul")) return "servicio";
  return "producto_digital";
}

// Deshabilitar bodyParser para poder leer el body raw y verificar firma Stripe
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (webhookSecret && webhookSecret !== "whsec_tu_secret_de_stripe_aqui" && sig) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
        apiVersion: "2025-02-24.acacia",
      });
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.warn("Webhook Stripe: firma inválida", err);
        return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
      }
    } else {
      // Sin verificación (desarrollo local)
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as unknown as Stripe.PaymentIntent;
      const montoOriginal = pi.amount / 100;
      const moneda = pi.currency.toUpperCase();
      const fechaTransaccion = new Date(pi.created * 1000);
      const descripcion = (pi.description ?? pi.statement_descriptor ?? "Stripe Payment") as string;

      const { montoUSD, tasaCambio } = await convertirAUSD(montoOriginal, moneda, fechaTransaccion);

      const compradorEmail = (pi.receipt_email ?? undefined)?.toLowerCase() || undefined;
      const compradorNombre = (pi.shipping?.name ?? undefined) || undefined;

      await upsertTransaccion({
        plataforma: "stripe",
        plataformaTxId: pi.id,
        montoUSD,
        montoOriginal,
        moneda,
        tasaCambio,
        categoria: inferirCategoria(descripcion),
        nombreProducto: descripcion.slice(0, 200),
        estado: "completado",
        fechaTransaccion,
        fuente: "webhook",
        compradorEmail,
        compradorNombre,
        payloadRaw: JSON.stringify(event),
      });
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as unknown as Stripe.Charge;
      const txId = (charge.payment_intent as string) ?? charge.id;
      const montoOriginal = (charge.amount_refunded ?? charge.amount) / 100;
      const moneda = charge.currency.toUpperCase();
      const fechaTransaccion = new Date(charge.created * 1000);

      const { montoUSD, tasaCambio } = await convertirAUSD(montoOriginal, moneda, fechaTransaccion);

      await upsertTransaccion({
        plataforma: "stripe",
        plataformaTxId: txId,
        montoUSD,
        montoOriginal,
        moneda,
        tasaCambio,
        categoria: "producto_digital",
        nombreProducto: charge.description ?? "Reembolso Stripe",
        estado: "reembolsado",
        fechaTransaccion,
        fuente: "webhook",
        payloadRaw: JSON.stringify(event),
      });
    }

    return NextResponse.json({ recibido: true });
  } catch (error) {
    console.error("Error en webhook Stripe:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
