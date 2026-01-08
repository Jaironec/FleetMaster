// Repositorio de Viajes - Acceso a BD
import prisma from '../config/database';
import { EstadoViaje, EstadoPagoCliente, Prisma } from '@prisma/client';

export interface FiltrosViajes {
    estado?: EstadoViaje;
    estadoPagoCliente?: EstadoPagoCliente;
    vehiculoId?: number;
    choferId?: number;
    clienteId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    skip?: number;
    take?: number;
}

export interface DatosCrearViaje {
    vehiculoId: number;
    choferId: number;
    clienteId: number;
    materialId: number;
    origen: string;
    destino: string;
    fechaSalida: Date;
    fechaLlegadaEstimada?: Date;
    kilometrosEstimados?: number;
    tarifa: number;
    montoPagoChofer?: number;
    diasCredito?: number; // 0, 15, 30, 60 días
    observaciones?: string;
}

export interface DatosActualizarViaje {
    origen?: string;
    destino?: string;
    fechaSalida?: Date;
    fechaLlegadaEstimada?: Date;
    fechaLlegadaReal?: Date;
    kilometrosEstimados?: number;
    kilometrosReales?: number;
    tarifa?: number;
    montoPagoChofer?: number;
    observaciones?: string;
    estado?: EstadoViaje;
    // Campos de facturación
    estadoPagoCliente?: EstadoPagoCliente;
    montoPagadoCliente?: number;
    fechaLimitePago?: Date;
    diasCredito?: number;
}

export const viajesRepository = {
    async findAll(filtros: FiltrosViajes = {}) {
        const where: Prisma.ViajeWhereInput = {};

        if (filtros.estado) where.estado = filtros.estado;
        if (filtros.estadoPagoCliente) where.estadoPagoCliente = filtros.estadoPagoCliente;
        if (filtros.vehiculoId) where.vehiculoId = filtros.vehiculoId;
        if (filtros.choferId) where.choferId = filtros.choferId;
        if (filtros.clienteId) where.clienteId = filtros.clienteId;

        if (filtros.fechaDesde || filtros.fechaHasta) {
            where.fechaSalida = {};
            if (filtros.fechaDesde) where.fechaSalida.gte = filtros.fechaDesde;
            if (filtros.fechaHasta) where.fechaSalida.lte = filtros.fechaHasta;
        }

        const [viajes, total] = await Promise.all([
            prisma.viaje.findMany({
                where,
                include: {
                    vehiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
                    chofer: { select: { id: true, nombres: true, apellidos: true, telefono: true } },
                    cliente: { select: { id: true, nombreRazonSocial: true } },
                    material: { select: { id: true, nombre: true } },
                    pagos: { select: { monto: true, estado: true } }, // Incluir estado para filtrar
                },
                orderBy: { fechaSalida: 'desc' },
                skip: filtros.skip || 0,
                take: filtros.take || 50,
            }),
            prisma.viaje.count({ where }),
        ]);

        // Calcular totales de pagos al chofer por viaje
        const viajesConPagos = viajes.map(viaje => {
            const pagadoChofer = viaje.pagos?.reduce((sum: number, p: any) => {
                return p.estado === 'PAGADO' ? sum + Number(p.monto) : sum;
            }, 0) || 0;
            return {
                ...viaje,
                pagadoChofer, // Monto total pagado al chofer para este viaje
            };
        });

        return { viajes: viajesConPagos, total };
    },

    async findById(id: number) {
        return prisma.viaje.findUnique({
            where: { id },
            include: {
                vehiculo: { select: { id: true, placa: true, marca: true, modelo: true, tipo: true } },
                chofer: { select: { id: true, nombres: true, apellidos: true, telefono: true, correo: true } },
                cliente: { select: { id: true, nombreRazonSocial: true, telefono: true, correo: true } },
                material: { select: { id: true, nombre: true, unidadMedida: true, esPeligroso: true } },
                gastos: {
                    include: {
                        comprobante: true,
                    },
                    orderBy: { fecha: 'desc' },
                },
                pagos: {
                    orderBy: { fecha: 'desc' },
                },
            },
        });
    },

    async create(datos: DatosCrearViaje) {
        // Calcular fecha límite de pago si hay días de crédito
        let fechaLimitePago: Date | undefined;
        if (datos.diasCredito && datos.diasCredito > 0) {
            fechaLimitePago = new Date(datos.fechaSalida);
            fechaLimitePago.setDate(fechaLimitePago.getDate() + datos.diasCredito);
        }

        return prisma.viaje.create({
            data: {
                vehiculoId: datos.vehiculoId,
                choferId: datos.choferId,
                clienteId: datos.clienteId,
                materialId: datos.materialId,
                origen: datos.origen,
                destino: datos.destino,
                fechaSalida: datos.fechaSalida,
                fechaLlegadaEstimada: datos.fechaLlegadaEstimada,
                kilometrosEstimados: datos.kilometrosEstimados,
                tarifa: datos.tarifa,
                montoPagoChofer: datos.montoPagoChofer,
                diasCredito: datos.diasCredito || 0,
                fechaLimitePago,
                observaciones: datos.observaciones,
                estado: EstadoViaje.PLANIFICADO,
            },
        });
    },

    async update(id: number, datos: DatosActualizarViaje) {
        return prisma.viaje.update({
            where: { id },
            data: datos,
        });
    },

    async delete(id: number) {
        return prisma.viaje.delete({ where: { id } });
    },

    // Verificar que existan entidades relacionadas
    async validarEntidadesRelacionadas(vehiculoId: number, choferId: number, clienteId: number, materialId: number) {
        const [vehiculo, chofer, cliente, material] = await Promise.all([
            prisma.vehiculo.findFirst({ where: { id: vehiculoId, estado: 'ACTIVO' } }),
            prisma.chofer.findFirst({ where: { id: choferId, estado: 'ACTIVO' } }),
            prisma.cliente.findFirst({ where: { id: clienteId, estado: 'ACTIVO' } }),
            prisma.material.findUnique({ where: { id: materialId } }),
        ]);

        const errores: string[] = [];
        if (!vehiculo) errores.push('Vehículo no encontrado o inactivo');
        if (!chofer) errores.push('Chofer no encontrado o inactivo');
        if (!cliente) errores.push('Cliente no encontrado o inactivo');
        if (!material) errores.push('Material no encontrado');

        // Validar licencia de chofer
        if (chofer && (chofer as any).fechaVencimientoLicencia) {
            const hoy = new Date();
            // Resetear horas para comparar solo fechas
            const fechaVencimiento = new Date((chofer as any).fechaVencimientoLicencia);
            fechaVencimiento.setHours(23, 59, 59, 999);

            if (fechaVencimiento < hoy) {
                errores.push(`La licencia del chofer ${chofer.nombres} ${chofer.apellidos} venció el ${fechaVencimiento.toLocaleDateString()}`);
            }
        }

        return { valido: errores.length === 0, errores };
    },

    /**
     * Verificar si hay solapamiento de viajes para un vehículo o chofer
     */
    async checkSolapamiento(
        fechaInicio: Date,
        fechaFin: Date | undefined,
        vehiculoId: number,
        choferId: number,
        excluirViajeId?: number
    ) {
        // Si no hay fecha fin (ej: llegada estimada), asumimos 24 horas por defecto para la validación
        const fin = fechaFin ? new Date(fechaFin) : new Date(fechaInicio.getTime() + 24 * 60 * 60 * 1000);

        // Criterio de solapamiento: (StartA <= EndB) and (EndA >= StartB)
        // Buscamos viajes que estén activos (PLANIFICADO o EN_CURSO)
        const where: Prisma.ViajeWhereInput = {
            estado: { in: [EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO] },
            AND: [
                { fechaSalida: { lte: fin } },
                { fechaLlegadaEstimada: { gte: fechaInicio } }
            ],
            OR: [
                { vehiculoId },
                { choferId }
            ]
        };

        if (excluirViajeId) {
            where.id = { not: excluirViajeId };
        }

        const conflictos = await prisma.viaje.findMany({
            where,
            select: {
                id: true,
                fechaSalida: true,
                fechaLlegadaEstimada: true,
                vehiculoId: true,
                choferId: true,
                estado: true
            }
        });

        return conflictos;
    },

    // Estadísticas para dashboard
    async getEstadisticasMensuales(anio: number, mes: number) {
        const inicioMes = new Date(anio, mes - 1, 1);
        const finMes = new Date(anio, mes, 0, 23, 59, 59);

        const [viajesCompletados, totalViajes] = await Promise.all([
            prisma.viaje.findMany({
                where: {
                    estado: EstadoViaje.COMPLETADO,
                    fechaSalida: { gte: inicioMes, lte: finMes },
                },
                select: { tarifa: true },
            }),
            prisma.viaje.count({
                where: {
                    fechaSalida: { gte: inicioMes, lte: finMes },
                },
            }),
        ]);

        const ingresosTotales = viajesCompletados.reduce(
            (sum, v) => sum + Number(v.tarifa),
            0
        );

        return {
            totalViajes,
            viajesCompletados: viajesCompletados.length,
            ingresosTotales,
        };
    },
};
