export type Plataforma = "hotmart" | "stripe" | "bancolombia";

export type Categoria =
  | "producto_digital"
  | "mentoria"
  | "servicio"
  | "membresia";

export type EstadoTransaccion = "completado" | "reembolsado" | "contracargo";

export type FuenteTransaccion = "webhook" | "importacion";

export interface TransaccionNormalizada {
  plataforma: Plataforma;
  plataformaTxId: string;
  montoUSD: number;
  montoOriginal: number;
  moneda: string;
  tasaCambio: number;
  categoria: Categoria;
  nombreProducto: string;
  estado: EstadoTransaccion;
  fechaTransaccion: Date;
  fuente: FuenteTransaccion;
  compradorEmail?: string;
  compradorNombre?: string;
  payloadRaw?: string;
}

export interface CompradorLTV {
  email: string;
  nombre: string;
  totalUSD: number;
  numCompras: number;
  productos: string[];
  primeraCompra: string;
  ultimaCompra: string;
}

export interface DatosLTV {
  tasaRecompraGeneral: number;           // % compradores con ≥2 compras
  totalCompradores: number;
  compradoresRecurrentes: number;
  ltvPromedio: number;
  topCompradores: CompradorLTV[];
  distribucionCompras: { compras: number; cantidad: number }[];
  recompraPorProducto: {
    producto: string;
    totalCompradores: number;
    compradorRecurrentes: number;
    tasaRecompra: number;
  }[];
}

export interface ResultadoImport {
  insertadas: number;
  omitidas: number;
  errores: number;
  detalles?: string[];
}

export interface MesData {
  mes: string; // "2024-01"
  label: string; // "Ene 2024"
  total: number;
  hotmart: number;
  stripe: number;
  bancolombia: number;
  producto_digital: number;
  mentoria: number;
  servicio: number;
  membresia: number;
}

export interface KPIsDashboard {
  ingresosMesActual: number;
  cambioMoM: number; // porcentaje, puede ser negativo
  promedioMensual12m: number;
  totalAcumulado: number;
  mejorMes: { mes: string; label: string; total: number } | null;
  peorMes: { mes: string; label: string; total: number } | null;
  rachaActual: number; // meses consecutivos de crecimiento (positivo) o decrecimiento (negativo)
  totalAnioActual: number;
  totalMismoPeriodoAnioAnterior: number;
}
