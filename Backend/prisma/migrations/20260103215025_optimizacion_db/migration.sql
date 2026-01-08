-- AlterTable
ALTER TABLE "choferes" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vehiculos" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "gastos_viaje_viaje_id_idx" ON "gastos_viaje"("viaje_id");

-- CreateIndex
CREATE INDEX "mantenimientos_vehiculo_id_idx" ON "mantenimientos"("vehiculo_id");

-- CreateIndex
CREATE INDEX "mantenimientos_estado_idx" ON "mantenimientos"("estado");

-- CreateIndex
CREATE INDEX "pagos_choferes_chofer_id_idx" ON "pagos_choferes"("chofer_id");

-- CreateIndex
CREATE INDEX "pagos_choferes_fecha_pago_idx" ON "pagos_choferes"("fecha_pago");

-- CreateIndex
CREATE INDEX "viajes_vehiculo_id_idx" ON "viajes"("vehiculo_id");

-- CreateIndex
CREATE INDEX "viajes_chofer_id_idx" ON "viajes"("chofer_id");

-- CreateIndex
CREATE INDEX "viajes_cliente_id_idx" ON "viajes"("cliente_id");

-- CreateIndex
CREATE INDEX "viajes_fecha_salida_idx" ON "viajes"("fecha_salida");

-- CreateIndex
CREATE INDEX "viajes_estado_idx" ON "viajes"("estado");

-- CreateIndex
CREATE INDEX "viajes_estado_pago_cliente_idx" ON "viajes"("estado_pago_cliente");
