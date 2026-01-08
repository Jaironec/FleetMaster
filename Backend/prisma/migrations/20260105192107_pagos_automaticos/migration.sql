-- CreateEnum
CREATE TYPE "EstadoPagoChofer" AS ENUM ('PENDIENTE', 'PAGADO');

-- AlterTable
ALTER TABLE "choferes" ADD COLUMN     "dia_pago" INTEGER,
ADD COLUMN     "pago_quincenal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pagos_choferes" ADD COLUMN     "estado" "EstadoPagoChofer" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "fecha_pago_real" TIMESTAMP(3);
