/*
  Warnings:

  - You are about to drop the column `pagado_cliente` on the `viajes` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoPagoCliente" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO');

-- AlterTable
ALTER TABLE "viajes" DROP COLUMN "pagado_cliente",
ADD COLUMN     "dias_credito" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estado_pago_cliente" "EstadoPagoCliente" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "fecha_limite_pago" TIMESTAMP(3),
ADD COLUMN     "monto_pagado_cliente" DECIMAL(10,2) NOT NULL DEFAULT 0;
