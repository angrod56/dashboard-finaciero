import { prisma } from "./db";
import type { MesData, KPIsDashboard, DatosLTV } from "@/types";

function labelMes(mesStr: string): string {
  const [anio, mes] = mesStr.split("-");
  const fecha = new Date(parseInt(anio), parseInt(mes) - 1, 1);
  return fecha.toLocaleDateString("es-CO", { month: "short", year: "numeric" });
}

/**
 * Obtiene los datos mensuales agregados para los últimos N meses.
 */
export async function obtenerDatosMensuales(meses: number = 24): Promise<MesData[]> {
  const fechaInicio = new Date();
  fechaInicio.setMonth(fechaInicio.getMonth() - meses);
  fechaInicio.setDate(1);
  fechaInicio.setHours(0, 0, 0, 0);

  const transacciones = await prisma.transaccion.findMany({
    where: {
      estado: "completado",
      fechaTransaccion: { gte: fechaInicio },
    },
    select: {
      fechaTransaccion: true,
      montoUSD: true,
      plataforma: true,
      categoria: true,
    },
  });

  // Agrupar por mes
  const porMes: Record<string, MesData> = {};

  for (const tx of transacciones) {
    const fecha = new Date(tx.fechaTransaccion);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

    if (!porMes[mesKey]) {
      porMes[mesKey] = {
        mes: mesKey,
        label: labelMes(mesKey),
        total: 0,
        hotmart: 0,
        stripe: 0,
        bancolombia: 0,
        producto_digital: 0,
        mentoria: 0,
        servicio: 0,
        membresia: 0,
      };
    }

    const m = porMes[mesKey];
    m.total += tx.montoUSD;

    // Por plataforma
    if (tx.plataforma === "hotmart") m.hotmart += tx.montoUSD;
    else if (tx.plataforma === "stripe") m.stripe += tx.montoUSD;
    else if (tx.plataforma === "bancolombia") m.bancolombia += tx.montoUSD;

    // Por categoría
    if (tx.categoria === "producto_digital") m.producto_digital += tx.montoUSD;
    else if (tx.categoria === "mentoria") m.mentoria += tx.montoUSD;
    else if (tx.categoria === "servicio") m.servicio += tx.montoUSD;
    else if (tx.categoria === "membresia") m.membresia += tx.montoUSD;
  }

  // Ordenar por mes ascendente
  return Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * Calcula los KPIs del dashboard.
 */
export async function calcularKPIs(): Promise<KPIsDashboard> {
  const ahora = new Date();
  const mesPasado = new Date(ahora);
  mesPasado.setMonth(mesPasado.getMonth() - 1);

  // Total mes actual
  const iniciMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ingresosMesActual = await prisma.transaccion.aggregate({
    where: { estado: "completado", fechaTransaccion: { gte: iniciMesActual } },
    _sum: { montoUSD: true },
  });

  // Total mes anterior
  const iniciMesPasado = new Date(mesPasado.getFullYear(), mesPasado.getMonth(), 1);
  const finMesPasado = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ingresosMesPasado = await prisma.transaccion.aggregate({
    where: {
      estado: "completado",
      fechaTransaccion: { gte: iniciMesPasado, lt: finMesPasado },
    },
    _sum: { montoUSD: true },
  });

  // Total acumulado
  const totalAcumulado = await prisma.transaccion.aggregate({
    where: { estado: "completado" },
    _sum: { montoUSD: true },
  });

  // Últimos 12 meses para promedio y mejor/peor
  const datos12m = await obtenerDatosMensuales(12);

  const mesActualTotal = ingresosMesActual._sum.montoUSD ?? 0;
  const mesPasadoTotal = ingresosMesPasado._sum.montoUSD ?? 0;
  const cambioMoM =
    mesPasadoTotal > 0
      ? ((mesActualTotal - mesPasadoTotal) / mesPasadoTotal) * 100
      : 0;

  const promedio12m =
    datos12m.length > 0
      ? datos12m.reduce((sum, m) => sum + m.total, 0) / datos12m.length
      : 0;

  const mesesConDatos = datos12m.filter((m) => m.total > 0);
  const mejorMes =
    mesesConDatos.length > 0
      ? mesesConDatos.reduce((max, m) => (m.total > max.total ? m : max))
      : null;
  const peorMes =
    mesesConDatos.length > 0
      ? mesesConDatos.reduce((min, m) => (m.total < min.total ? m : min))
      : null;

  // Racha de crecimiento
  let rachaActual = 0;
  const datosTodos = await obtenerDatosMensuales(24);
  for (let i = datosTodos.length - 1; i > 0; i--) {
    if (datosTodos[i].total > datosTodos[i - 1].total) {
      rachaActual++;
    } else {
      break;
    }
  }

  // Año actual vs mismo período año anterior
  const anioActual = ahora.getFullYear();
  const iniciAnio = new Date(anioActual, 0, 1);
  const totalAnioActual = await prisma.transaccion.aggregate({
    where: { estado: "completado", fechaTransaccion: { gte: iniciAnio } },
    _sum: { montoUSD: true },
  });

  const iniciAnioAnterior = new Date(anioActual - 1, 0, 1);
  const finAnioAnterior = new Date(anioActual, 0, 1);
  const totalAnioAnterior = await prisma.transaccion.aggregate({
    where: {
      estado: "completado",
      fechaTransaccion: { gte: iniciAnioAnterior, lt: finAnioAnterior },
    },
    _sum: { montoUSD: true },
  });

  return {
    ingresosMesActual: mesActualTotal,
    cambioMoM: Math.round(cambioMoM * 10) / 10,
    promedioMensual12m: Math.round(promedio12m * 100) / 100,
    totalAcumulado: totalAcumulado._sum.montoUSD ?? 0,
    mejorMes: mejorMes
      ? { mes: mejorMes.mes, label: mejorMes.label, total: mejorMes.total }
      : null,
    peorMes: peorMes
      ? { mes: peorMes.mes, label: peorMes.label, total: peorMes.total }
      : null,
    rachaActual,
    totalAnioActual: totalAnioActual._sum.montoUSD ?? 0,
    totalMismoPeriodoAnioAnterior: totalAnioAnterior._sum.montoUSD ?? 0,
  };
}

/**
 * Calcula LTV por comprador y tasas de recompra.
 * Solo incluye transacciones con email de comprador.
 */
export async function calcularLTV(): Promise<DatosLTV> {
  const transacciones = await prisma.transaccion.findMany({
    where: {
      estado: "completado",
      compradorEmail: { not: null },
    },
    select: {
      compradorEmail: true,
      compradorNombre: true,
      montoUSD: true,
      nombreProducto: true,
      fechaTransaccion: true,
    },
    orderBy: { fechaTransaccion: "asc" },
  });

  // Agrupar por comprador
  const porComprador = new Map<string, {
    nombre: string;
    totalUSD: number;
    compras: number;
    productos: Set<string>;
    primeraCompra: Date;
    ultimaCompra: Date;
  }>();

  for (const tx of transacciones) {
    const email = tx.compradorEmail!;
    const existing = porComprador.get(email);
    if (!existing) {
      porComprador.set(email, {
        nombre: tx.compradorNombre ?? email,
        totalUSD: tx.montoUSD,
        compras: 1,
        productos: new Set([tx.nombreProducto]),
        primeraCompra: tx.fechaTransaccion,
        ultimaCompra: tx.fechaTransaccion,
      });
    } else {
      existing.totalUSD += tx.montoUSD;
      existing.compras++;
      existing.productos.add(tx.nombreProducto);
      if (tx.fechaTransaccion > existing.ultimaCompra) existing.ultimaCompra = tx.fechaTransaccion;
    }
  }

  const compradores = Array.from(porComprador.entries());
  const totalCompradores = compradores.length;
  const compradoresRecurrentes = compradores.filter(([, c]) => c.compras >= 2).length;
  const tasaRecompraGeneral = totalCompradores > 0
    ? Math.round((compradoresRecurrentes / totalCompradores) * 1000) / 10
    : 0;
  const ltvPromedio = totalCompradores > 0
    ? compradores.reduce((s, [, c]) => s + c.totalUSD, 0) / totalCompradores
    : 0;

  // Top 20 compradores por LTV
  const topCompradores = compradores
    .sort((a, b) => b[1].totalUSD - a[1].totalUSD)
    .slice(0, 20)
    .map(([email, c]) => ({
      email,
      nombre: c.nombre,
      totalUSD: Math.round(c.totalUSD * 100) / 100,
      numCompras: c.compras,
      productos: Array.from(c.productos),
      primeraCompra: c.primeraCompra.toISOString().slice(0, 10),
      ultimaCompra: c.ultimaCompra.toISOString().slice(0, 10),
    }));

  // Distribución de compras (cuántos compradores tienen 1, 2, 3+ compras)
  const distMap = new Map<number, number>();
  for (const [, c] of compradores) {
    const bucket = c.compras >= 5 ? 5 : c.compras;
    distMap.set(bucket, (distMap.get(bucket) ?? 0) + 1);
  }
  const distribucionCompras = Array.from(distMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([compras, cantidad]) => ({ compras, cantidad }));

  // Recompra por producto
  const porProducto = new Map<string, { emails: Set<string>; emailsRecurrentes: Set<string> }>();
  for (const tx of transacciones) {
    const producto = tx.nombreProducto;
    const email = tx.compradorEmail!;
    if (!porProducto.has(producto)) {
      porProducto.set(producto, { emails: new Set(), emailsRecurrentes: new Set() });
    }
    const p = porProducto.get(producto)!;
    if (p.emails.has(email)) {
      p.emailsRecurrentes.add(email);
    } else {
      p.emails.add(email);
    }
  }

  const recompraPorProducto = Array.from(porProducto.entries())
    .filter(([, p]) => p.emails.size >= 3) // solo mostrar productos con al menos 3 compradores
    .map(([producto, p]) => ({
      producto,
      totalCompradores: p.emails.size,
      compradorRecurrentes: p.emailsRecurrentes.size,
      tasaRecompra: Math.round((p.emailsRecurrentes.size / p.emails.size) * 1000) / 10,
    }))
    .sort((a, b) => b.tasaRecompra - a.tasaRecompra);

  return {
    tasaRecompraGeneral,
    totalCompradores,
    compradoresRecurrentes,
    ltvPromedio: Math.round(ltvPromedio * 100) / 100,
    topCompradores,
    distribucionCompras,
    recompraPorProducto,
  };
}
