// Repositorio de Mantenimientos
import prisma from '../config/database';
import { TipoMantenimiento, TipoComprobante, EstadoMantenimiento } from '@prisma/client';

export interface DatosCrearMantenimiento {
    vehiculoId: number;
    tipo: TipoMantenimiento;
    descripcion?: string;
    taller?: string;
    esExterno?: boolean;
    costoManoObra?: number;
    costoRepuestos?: number;
    costoTotal?: number;
    fecha: Date;
    kilometrajeAlMomento?: number;
    proximaFecha?: Date;
    proximoKilometraje?: number;
    estado?: EstadoMantenimiento;
    fechaInicio?: Date;
}

export interface FiltrosMantenimiento {
    vehiculoId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    tipo?: TipoMantenimiento;
    estado?: string;
}

export interface DatosComprobanteMantenimiento {
    tipo: TipoComprobante;
    url: string;
    publicId: string;
    nombreArchivoOriginal: string;
}

export const mantenimientosRepository = {
    async findAll(filtros: FiltrosMantenimiento) {
        const { vehiculoId, fechaDesde, fechaHasta, tipo, estado } = filtros;
        const where: any = {};

        if (vehiculoId) where.vehiculoId = vehiculoId;
        if (tipo) where.tipo = tipo;
        if (estado) where.estado = estado;
        if (fechaDesde || fechaHasta) {
            where.fecha = {};
            if (fechaDesde) where.fecha.gte = fechaDesde;
            if (fechaHasta) where.fecha.lte = fechaHasta;
        }

        return prisma.mantenimiento.findMany({
            where,
            include: {
                vehiculo: {
                    select: { id: true, placa: true, marca: true, modelo: true, kilometrajeActual: true }
                },
                comprobante: true,
            },
            orderBy: [
                { estado: 'asc' }, // PENDIENTE y EN_CURSO primero
                { fecha: 'desc' }
            ],
        });
    },

    async findById(id: number) {
        return prisma.mantenimiento.findUnique({
            where: { id },
            include: {
                vehiculo: true,
                comprobante: true,
            },
        });
    },

    async create(datos: DatosCrearMantenimiento, comprobanteId?: number) {
        return prisma.mantenimiento.create({
            data: {
                vehiculoId: datos.vehiculoId,
                tipo: datos.tipo,
                descripcion: datos.descripcion,
                taller: datos.taller,
                esExterno: datos.esExterno ?? true,
                costoManoObra: datos.costoManoObra || 0,
                costoRepuestos: datos.costoRepuestos || 0,
                costoTotal: datos.costoTotal,
                fecha: datos.fecha,
                kilometrajeAlMomento: datos.kilometrajeAlMomento,
                proximaFecha: datos.proximaFecha,
                proximoKilometraje: datos.proximoKilometraje,
                comprobanteId,
            },
            include: {
                vehiculo: true,
                comprobante: true,
            },
        });
    },

    async createComprobante(datos: DatosComprobanteMantenimiento) {
        return prisma.comprobante.create({
            data: {
                tipo: datos.tipo,
                url: datos.url,
                publicId: datos.publicId,
                nombreArchivoOriginal: datos.nombreArchivoOriginal,
            },
        });
    },

    async update(id: number, datos: Partial<DatosCrearMantenimiento>) {
        return prisma.mantenimiento.update({
            where: { id },
            data: {
                ...(datos.tipo && { tipo: datos.tipo }),
                ...(datos.descripcion && { descripcion: datos.descripcion }),
                ...(datos.taller && { taller: datos.taller }),
                ...(datos.esExterno !== undefined && { esExterno: datos.esExterno }),
                ...(datos.costoManoObra && { costoManoObra: datos.costoManoObra }),
                ...(datos.costoRepuestos && { costoRepuestos: datos.costoRepuestos }),
                ...(datos.costoTotal && { costoTotal: datos.costoTotal }),
                ...(datos.fecha && { fecha: datos.fecha }),
                ...(datos.kilometrajeAlMomento && { kilometrajeAlMomento: datos.kilometrajeAlMomento }),
                ...(datos.proximaFecha && { proximaFecha: datos.proximaFecha }),
                ...(datos.proximoKilometraje && { proximoKilometraje: datos.proximoKilometraje }),
                ...(datos.fechaInicio && { fechaInicio: datos.fechaInicio }),
            },
            include: { comprobante: true },
        });
    },

    async delete(id: number) {
        return prisma.mantenimiento.delete({ where: { id } });
    },

    // Sumar costos de mantenimiento (para reportes)
    // SOLO suma mantenimientos COMPLETADOS, ya que los pendientes/cancelados no son gasto real aún.
    async sumarCostos(vehiculoId?: number, fechaDesde?: Date, fechaHasta?: Date) {
        const where: any = {
            estado: 'COMPLETADO'
        };

        if (vehiculoId) {
            where.vehiculoId = vehiculoId;
        }
        if (fechaDesde || fechaHasta) {
            where.fecha = {};
            if (fechaDesde) where.fecha.gte = fechaDesde;
            if (fechaHasta) where.fecha.lte = fechaHasta;
        }

        const result = await prisma.mantenimiento.aggregate({
            where,
            _sum: { costoTotal: true },
        });
        return Number(result._sum.costoTotal) || 0;
    }
};
