// Repositorio de Pagos a Choferes
import prisma from '../config/database';
import { MetodoPago, TipoComprobante, EstadoPagoChofer } from '@prisma/client';

export interface DatosCrearPagoChofer {
    choferId: number;
    monto: number;
    fecha: Date;
    metodoPago?: MetodoPago;
    descripcion?: string;
    viajeId?: number;
    estado?: EstadoPagoChofer;  // NUEVO: Estado del pago
}

export interface FiltrosPagoChofer {
    choferId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    estado?: 'PENDIENTE' | 'PAGADO';
}

export interface DatosComprobantePago {
    tipo: TipoComprobante;
    url: string;
    publicId: string;
    nombreArchivoOriginal: string;
}

export const pagosChoferRepository = {
    async findAll(filtros: FiltrosPagoChofer) {
        const { choferId, fechaDesde, fechaHasta, estado } = filtros;
        return prisma.pagoChofer.findMany({
            where: {
                choferId,
                fecha: {
                    gte: fechaDesde,
                    lte: fechaHasta,
                },
                estado: estado || undefined,
            },
            include: {
                chofer: {
                    select: { nombres: true, apellidos: true, documentoId: true }
                },
                comprobante: true,
            },
            orderBy: { fecha: 'desc' },
        });
    },

    async findById(id: number) {
        return prisma.pagoChofer.findUnique({
            where: { id },
            include: {
                chofer: true,
                comprobante: true,
            },
        });
    },

    async create(datos: DatosCrearPagoChofer, comprobanteId?: number) {
        return prisma.pagoChofer.create({
            data: {
                choferId: datos.choferId,
                monto: datos.monto,
                fecha: datos.fecha,
                metodoPago: datos.metodoPago || MetodoPago.EFECTIVO,
                descripcion: datos.descripcion,
                comprobanteId,
                viajeId: datos.viajeId,
                estado: datos.estado || 'PENDIENTE'  // Por defecto PENDIENTE
            },
            include: {
                chofer: true,
                comprobante: true,
                viaje: {
                    select: { origen: true, destino: true, tarifa: true }
                }
            },
        });
    },

    // NUEVO: Marcar pago como pagado
    async marcarPagado(id: number) {
        return prisma.pagoChofer.update({
            where: { id },
            data: {
                estado: 'PAGADO',
                fechaPagoReal: new Date()
            },
            include: {
                chofer: true,
                viaje: {
                    select: { origen: true, destino: true }
                }
            }
        });
    },

    async createComprobante(datos: DatosComprobantePago) {
        return prisma.comprobante.create({
            data: {
                tipo: datos.tipo,
                url: datos.url,
                publicId: datos.publicId,
                nombreArchivoOriginal: datos.nombreArchivoOriginal,
            },
        });
    },

    async update(id: number, datos: Partial<DatosCrearPagoChofer>) {
        return prisma.pagoChofer.update({
            where: { id },
            data: datos,
            include: { comprobante: true },
        });
    },

    async delete(id: number) {
        return prisma.pagoChofer.delete({ where: { id } });
    },

    // Sumar pagos a un chofer en un periodo (para balance)
    // Si choferId es undefined, suma todos los pagos de todos los choferes
    async sumarPagos(choferId?: number, fechaDesde?: Date, fechaHasta?: Date) {
        const where: any = {};
        if (choferId) {
            where.choferId = choferId;
        }
        if (fechaDesde || fechaHasta) {
            where.fecha = {};
            if (fechaDesde) where.fecha.gte = fechaDesde;
            if (fechaHasta) where.fecha.lte = fechaHasta;
        }

        const result = await prisma.pagoChofer.aggregate({
            where,
            _sum: { monto: true },
        });
        return Number(result._sum.monto) || 0;
    },

    // Sumar pagos específicos de un viaje
    async sumarPagosPorViaje(viajeId: number) {
        const result = await prisma.pagoChofer.aggregate({
            where: { viajeId },
            _sum: { monto: true },
        });
        return Number(result._sum.monto) || 0;
    },

    // FIX #4: Verificar si ya existe un pago para un viaje específico
    async findByViaje(viajeId: number) {
        return prisma.pagoChofer.findFirst({
            where: { viajeId }
        });
    }
};
