// Repositorio de Vehículos - Acceso a BD
import prisma from '../config/database';
import { EstadoVehiculo } from '@prisma/client';

export interface FiltrosVehiculo {
    busqueda?: string;
    estado?: EstadoVehiculo;
}

// Configuración de kilometraje para mantenimiento
const INTERVALO_MANTENIMIENTO_KM = 5000;
const KM_ALERTA_ANTES = 500;

export const vehiculoRepository = {
    async findAll(filtros: FiltrosVehiculo = {}) {
        const where: any = {};
        if (filtros.busqueda) {
            where.OR = [
                { placa: { contains: filtros.busqueda, mode: 'insensitive' } },
                { marca: { contains: filtros.busqueda, mode: 'insensitive' } },
                { modelo: { contains: filtros.busqueda, mode: 'insensitive' } }
            ];
        }
        if (filtros.estado) where.estado = filtros.estado;

        const vehiculos = await prisma.vehiculo.findMany({
            where,
            orderBy: { placa: 'asc' },
            include: {
                mantenimientos: {
                    orderBy: { fecha: 'desc' },
                    take: 5, // Aumentar para buscar el último completado si hay pendientes
                    select: {
                        id: true,
                        fecha: true,
                        kilometrajeAlMomento: true,
                        descripcion: true,
                        tipo: true,
                        estado: true
                    }
                }
            }
        });

        // Calcular estado de mantenimiento para cada vehículo
        return vehiculos.map(v => {
            // Buscar el último mantenimiento COMPLETADO para cálculo de kms
            const ultimoMantCompletado = v.mantenimientos.find(m => m.estado === 'COMPLETADO');
            // Verificar si hay alguno PENDIENTE o EN_CURSO (generalmente el primero si existe)
            const tieneMantenimientoPendiente = v.mantenimientos.some(m => m.estado === 'PENDIENTE' || m.estado === 'EN_CURSO');

            const kmUltimoMant = ultimoMantCompletado?.kilometrajeAlMomento || 0;
            const proximoMantKm = kmUltimoMant + INTERVALO_MANTENIMIENTO_KM;
            const kmParaProximoMant = proximoMantKm - v.kilometrajeActual;

            // Necesita mantenimiento si está cerca del km O si ya tiene uno pendiente
            const necesitaMantenimiento = kmParaProximoMant <= KM_ALERTA_ANTES || tieneMantenimientoPendiente;
            const mantenimientoVencido = kmParaProximoMant <= 0;

            return {
                ...v,
                ultimoMantenimiento: ultimoMantCompletado || null,
                proximoMantenimientoKm: proximoMantKm,
                kmParaProximoMant,
                necesitaMantenimiento,
                mantenimientoVencido,
                tieneMantenimientoPendiente // Nuevo flag para UI
            };
        });
    },

    async findById(id: number) {
        return prisma.vehiculo.findUnique({
            where: { id },
            include: {
                mantenimientos: {
                    orderBy: { fecha: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        fecha: true,
                        kilometrajeAlMomento: true,
                        descripcion: true,
                        tipo: true,
                        estado: true
                    }
                }
            }
        });
    },

    async findByPlaca(placa: string) {
        return prisma.vehiculo.findUnique({ where: { placa } });
    },

    async create(data: any) {
        return prisma.vehiculo.create({ data });
    },

    async update(id: number, data: any) {
        return prisma.vehiculo.update({ where: { id }, data });
    },

    async delete(id: number) {
        return prisma.vehiculo.delete({ where: { id } });
    },

    async countActivos() {
        return prisma.vehiculo.count({ where: { estado: 'ACTIVO' } });
    },

    async countTotal() {
        return prisma.vehiculo.count();
    }
};

