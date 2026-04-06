-- CreateTable
CREATE TABLE "Transaccion" (
    "id" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "plataformaTxId" TEXT NOT NULL,
    "montoUSD" DOUBLE PRECISION NOT NULL,
    "montoOriginal" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL,
    "tasaCambio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "categoria" TEXT NOT NULL,
    "nombreProducto" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaTransaccion" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "compradorEmail" TEXT,
    "compradorNombre" TEXT,
    "fuente" TEXT NOT NULL,
    "importBatchId" TEXT,
    "payloadRaw" TEXT,

    CONSTRAINT "Transaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "totalFilas" INTEGER NOT NULL,
    "filasInsertadas" INTEGER NOT NULL,
    "filasOmitidas" INTEGER NOT NULL,
    "filasError" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasaCambio" (
    "id" TEXT NOT NULL,
    "desdeDivisa" TEXT NOT NULL,
    "hastaDivisa" TEXT NOT NULL,
    "tasa" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TasaCambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaccion_fechaTransaccion_idx" ON "Transaccion"("fechaTransaccion");

-- CreateIndex
CREATE INDEX "Transaccion_plataforma_idx" ON "Transaccion"("plataforma");

-- CreateIndex
CREATE INDEX "Transaccion_categoria_idx" ON "Transaccion"("categoria");

-- CreateIndex
CREATE INDEX "Transaccion_compradorEmail_idx" ON "Transaccion"("compradorEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Transaccion_plataforma_plataformaTxId_key" ON "Transaccion"("plataforma", "plataformaTxId");

-- CreateIndex
CREATE UNIQUE INDEX "TasaCambio_desdeDivisa_hastaDivisa_fecha_key" ON "TasaCambio"("desdeDivisa", "hastaDivisa", "fecha");

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
