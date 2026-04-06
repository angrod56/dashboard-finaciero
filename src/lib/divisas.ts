import { prisma } from "./db";

// Tasa de cambio de respaldo (COP → USD)
// Actualizar periódicamente o configurar en la DB
const TASA_FALLBACK_COP_USD = 0.00024; // aprox 1 COP = 0.00024 USD (4200 COP por USD)

/**
 * Convierte un monto a USD.
 * Si la moneda ya es USD, retorna el monto sin cambios.
 * Para COP busca la tasa en la DB; si no existe, usa la tasa de respaldo.
 */
export async function convertirAUSD(
  monto: number,
  moneda: string,
  fecha: Date
): Promise<{ montoUSD: number; tasaCambio: number; esTasaAproximada: boolean }> {
  if (moneda.toUpperCase() === "USD") {
    return { montoUSD: monto, tasaCambio: 1.0, esTasaAproximada: false };
  }

  if (moneda.toUpperCase() === "COP") {
    // Buscar tasa más cercana a la fecha (±7 días)
    const fechaInicio = new Date(fecha);
    fechaInicio.setDate(fechaInicio.getDate() - 7);
    const fechaFin = new Date(fecha);
    fechaFin.setDate(fechaFin.getDate() + 7);

    const tasa = await prisma.tasaCambio.findFirst({
      where: {
        desdeDivisa: "COP",
        hastaDivisa: "USD",
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
      orderBy: { fecha: "desc" },
    });

    if (tasa) {
      return {
        montoUSD: monto * tasa.tasa,
        tasaCambio: tasa.tasa,
        esTasaAproximada: false,
      };
    }

    // Usar tasa de respaldo
    return {
      montoUSD: monto * TASA_FALLBACK_COP_USD,
      tasaCambio: TASA_FALLBACK_COP_USD,
      esTasaAproximada: true,
    };
  }

  // BRL (Hotmart Brasil) u otras monedas — usar tasa aproximada
  // BRL ≈ 0.20 USD
  const tasasBRL: Record<string, number> = {
    BRL: 0.2,
    EUR: 1.08,
    GBP: 1.27,
    MXN: 0.058,
  };

  const tasa = tasasBRL[moneda.toUpperCase()] ?? 1.0;
  return {
    montoUSD: monto * tasa,
    tasaCambio: tasa,
    esTasaAproximada: true,
  };
}

export function formatearUSD(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatearMoneda(valor: number, moneda: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}
