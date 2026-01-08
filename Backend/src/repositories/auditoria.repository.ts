// Repositorio de Auditoría - Acceso a BD
import prisma from '../config/database';
import { AccionAuditoria } from '@prisma/client';

export interface FiltrosAuditoria {
    entidad?: string;
    accion?: AccionAuditoria;
    usuarioId?: number;
    fechaInicio?: Date;
    fechaFin?: Date;
    page?: number;
    limit?: number;
}

export interface DatosAuditoria {
    accion: AccionAuditoria;
    entidad: string;
    entidadId: number;
    datosAnteriores?: any;
    datosNuevos?: any;
    ipAddress?: string;
}

export const auditoriaRepository = {
    /**
     * Buscar registros de auditoría con filtros y paginación
     */
    async findAll(filtros: FiltrosAuditoria = {}) {
        const page = filtros.page || 1;
        const limit = filtros.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (filtros.entidad) {
            where.entidad = filtros.entidad;
        }
        if (filtros.accion) {
            where.accion = filtros.accion;
        }
        if (filtros.usuarioId) {
            where.usuarioId = filtros.usuarioId;
        }
        if (filtros.fechaInicio || filtros.fechaFin) {
            where.fechaHora = {};
            if (filtros.fechaInicio) {
                where.fechaHora.gte = filtros.fechaInicio;
            }
            if (filtros.fechaFin) {
                where.fechaHora.lte = filtros.fechaFin;
            }
        }

        const [items, total] = await Promise.all([
            prisma.registroAuditoria.findMany({
                where,
                include: {
                    usuario: {
                        select: { id: true, nombreCompleto: true, nombreUsuario: true }
                    }
                },
                orderBy: { fechaHora: 'desc' },
                skip,
                take: limit
            }),
            prisma.registroAuditoria.count({ where })
        ]);

        // No enviar datos antes/después en el listado para reducir tamaño
        const itemsSinDatos = items.map(item => ({
            id: item.id,
            entidad: item.entidad,
            entidadId: item.entidadId,
            accion: item.accion,
            usuario: item.usuario,
            fechaHora: item.fechaHora,
            ipAddress: item.ipAddress
        }));

        return {
            items: itemsSinDatos,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Obtener un registro de auditoría por ID con todos los detalles
     */
    async findById(id: number) {
        return prisma.registroAuditoria.findUnique({
            where: { id },
            include: {
                usuario: {
                    select: { id: true, nombreCompleto: true, nombreUsuario: true }
                }
            }
        });
    },

    /**
     * Crear un registro de auditoría
     */
    async create(usuarioId: number, datos: DatosAuditoria) {
        return prisma.registroAuditoria.create({
            data: {
                usuarioId,
                accion: datos.accion,
                entidad: datos.entidad,
                entidadId: datos.entidadId,
                datosAnteriores: datos.datosAnteriores || null,
                datosNuevos: datos.datosNuevos || null,
                ipAddress: datos.ipAddress || null
            }
        });
    },

    /**
     * Obtener lista de entidades únicas para filtros
     */
    async getEntidadesUnicas() {
        const result = await prisma.registroAuditoria.findMany({
            distinct: ['entidad'],
            select: { entidad: true },
            orderBy: { entidad: 'asc' }
        });
        return result.map(r => r.entidad);
    }
};
