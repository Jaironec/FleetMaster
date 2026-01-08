-- CreateEnum
CREATE TYPE "EstadoMantenimiento" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "mantenimientos" ADD COLUMN     "estado" "EstadoMantenimiento" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "fecha_fin" TIMESTAMP(3),
ADD COLUMN     "fecha_inicio" TIMESTAMP(3),
ALTER COLUMN "taller" DROP NOT NULL,
ALTER COLUMN "costo_total" SET DEFAULT 0;
