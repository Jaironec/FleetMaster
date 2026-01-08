/*
  Warnings:

  - You are about to drop the column `fecha` on the `mantenimientos` table. All the data in the column will be lost.
  - You are about to drop the column `url_comprobante` on the `mantenimientos` table. All the data in the column will be lost.
  - You are about to drop the column `fecha` on the `pagos_choferes` table. All the data in the column will be lost.
  - You are about to drop the column `url_comprobante` on the `pagos_choferes` table. All the data in the column will be lost.
  - Added the required column `fecha_mantenimiento` to the `mantenimientos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fecha_pago` to the `pagos_choferes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "mantenimientos" DROP COLUMN "fecha",
DROP COLUMN "url_comprobante",
ADD COLUMN     "comprobante_id" INTEGER,
ADD COLUMN     "fecha_mantenimiento" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "descripcion" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pagos_choferes" DROP COLUMN "fecha",
DROP COLUMN "url_comprobante",
ADD COLUMN     "comprobante_id" INTEGER,
ADD COLUMN     "fecha_pago" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "viaje_id" INTEGER;

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_comprobante_id_fkey" FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_choferes" ADD CONSTRAINT "pagos_choferes_comprobante_id_fkey" FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_choferes" ADD CONSTRAINT "pagos_choferes_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
