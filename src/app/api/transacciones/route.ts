import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagina = parseInt(searchParams.get("pagina") || "1");
    const porPagina = Math.min(parseInt(searchParams.get("porPagina") || "50"), 100);
    const plataforma = searchParams.get("plataforma");
    const categoria = searchParams.get("categoria");
    const estado = searchParams.get("estado");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const where: Record<string, unknown> = {};
    if (plataforma) where.plataforma = plataforma;
    if (categoria) where.categoria = categoria;
    if (estado) where.estado = estado;
    if (desde || hasta) {
      where.fechaTransaccion = {
        ...(desde ? { gte: new Date(desde) } : {}),
        ...(hasta ? { lte: new Date(hasta) } : {}),
      };
    }

    const [total, transacciones] = await Promise.all([
      prisma.transaccion.count({ where }),
      prisma.transaccion.findMany({
        where,
        orderBy: { fechaTransaccion: "desc" },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          plataforma: true,
          plataformaTxId: true,
          montoUSD: true,
          montoOriginal: true,
          moneda: true,
          categoria: true,
          nombreProducto: true,
          estado: true,
          fechaTransaccion: true,
          fuente: true,
          creadoEn: true,
        },
      }),
    ]);

    return NextResponse.json({
      transacciones,
      total,
      pagina,
      totalPaginas: Math.ceil(total / porPagina),
    });
  } catch (error) {
    console.error("Error en /api/transacciones:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
