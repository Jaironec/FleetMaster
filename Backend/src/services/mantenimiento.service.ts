// Servicio de Mantenimientos - Lógica de negocio
import { TipoComprobante, AccionAuditoria, EstadoVehiculo, EstadoMantenimiento, TipoMantenimiento } from '@prisma/client';
import prisma from '../config/database';
import { mantenimientosRepository, DatosCrearMantenimiento, FiltrosMantenimiento } from '../repositories/mantenimiento.repository';
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary.service';

export interface DatosCrearMantenimientoConArchivo {
    vehiculoId: number;
    tipo: 'PREVENTIVO' | 'CORRECTIVO';
    descripcion?: string;
    taller?: string;
    costoManoObra?: number;
    costoRepuestos?: number;
    fecha: Date;
    kilometrajeAlMomento?: number;
    proximaFecha?: Date;
    proximoKilometraje?: number;
    archivo?: {
        buffer: Buffer;
        originalname: string;
    };
}

export interface DatosCompletarMantenimiento {
    taller: string;
    costoManoObra: number;
    costoRepuestos: number;
    descripcion?: string;
    kilometrajeAlMomento?: number;
    proximoKilometraje?: number;
    archivo?: {
        buffer: Buffer;
        originalname: string;
    };
}

export const mantenimientoService = {
    async listar(filtros: FiltrosMantenimiento) {
        return mantenimientosRepository.findAll(filtros);
    },

    async obtenerDetalle(id: number) {
        const mantenimiento = await mantenimientosRepository.findById(id);
        if (!mantenimiento) {
            throw new Error('Mantenimiento no encontrado');
        }
        return mantenimiento;
    },

    /**
     * Crear mantenimiento
     * - PREVENTIVO: Inicia en estado PENDIENTE (programado)
     * - CORRECTIVO: Inicia en estado EN_CURSO y pone el vehículo EN_MANTENIMIENTO
     */
    async crear(datos: DatosCrearMantenimientoConArchivo, usuarioId: number) {
        // 1. Validar Vehículo
        const vehiculo = await vehiculoRepository.findById(datos.vehiculoId);
        if (!vehiculo) {
            throw new Error('Vehículo no encontrado');
        }
        if (vehiculo.estado === 'INACTIVO') {
            throw new Error('No se puede registrar mantenimiento a un vehículo inactivo');
        }

        // 2. Determinar estado inicial según tipo
        const esCorrectivo = datos.tipo === 'CORRECTIVO';
        const estadoInicial = esCorrectivo ? EstadoMantenimiento.EN_CURSO : EstadoMantenimiento.PENDIENTE;

        // 3. Calcular Costo Total (si ya tiene costos)
        const costoTotal = (datos.costoManoObra || 0) + (datos.costoRepuestos || 0);

        // Subir archivo si existe (fuera de transacción porque es externo)
        let comprobanteId: number | undefined;
        if (datos.archivo) {
            const resultadoUpload = await uploadToCloudinary(
                datos.archivo.buffer,
                'comprobantes/mantenimientos',
                datos.archivo.originalname
            );

            const comprobante = await mantenimientosRepository.createComprobante({
                tipo: TipoComprobante.MANTENIMIENTO,
                url: resultadoUpload.url,
                publicId: resultadoUpload.publicId,
                nombreArchivoOriginal: datos.archivo.originalname
            });
            comprobanteId = comprobante.id;
        }

        // Usar transacción para garantizar atomicidad
        const mantenimiento = await prisma.$transaction(async (tx) => {
            // 1. Crear Mantenimiento
            const mantenimiento = await tx.mantenimiento.create({
                data: {
                    vehiculoId: datos.vehiculoId,
                    tipo: datos.tipo as TipoMantenimiento,
                    estado: estadoInicial,
                    descripcion: datos.descripcion,
                    taller: datos.taller || '',
                    esExterno: true,
                    costoManoObra: datos.costoManoObra || 0,
                    costoRepuestos: datos.costoRepuestos || 0,
                    costoTotal,
                    fecha: datos.fecha,
                    fechaInicio: esCorrectivo ? new Date() : null,
                    kilometrajeAlMomento: datos.kilometrajeAlMomento,
                    proximaFecha: datos.proximaFecha,
                    proximoKilometraje: datos.proximoKilometraje,
                    comprobanteId
                },
                include: { vehiculo: true }
            });

            // 2. Si es CORRECTIVO, cambiar vehículo a EN_MANTENIMIENTO
            if (esCorrectivo) {
                await tx.vehiculo.update({
                    where: { id: datos.vehiculoId },
                    data: { estado: EstadoVehiculo.EN_MANTENIMIENTO }
                });
            }

            return mantenimiento;
        });

        // Registrar auditoría (fuera de la transacción)
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Mantenimiento',
            entidadId: mantenimiento.id,
            datosNuevos: mantenimiento
        });

        return mantenimiento;
    },

    /**
     * Iniciar un mantenimiento PENDIENTE (llevarlo al taller)
     * Cambia de PENDIENTE → EN_CURSO
     */
    async iniciar(id: number, taller: string, usuarioId: number) {
        const mantenimiento = await mantenimientosRepository.findById(id);

        if (!mantenimiento) {
            throw new Error('Mantenimiento no encontrado');
        }

        if (mantenimiento.estado !== 'PENDIENTE') {
            throw new Error(`No se puede iniciar un mantenimiento en estado ${mantenimiento.estado}`);
        }

        // FIX #6: Validar que el vehículo no tenga viajes activos
        const viajesActivos = await prisma.viaje.count({
            where: {
                vehiculoId: mantenimiento.vehiculoId,
                estado: { in: ['PLANIFICADO', 'EN_CURSO'] }
            }
        });

        if (viajesActivos > 0) {
            throw new Error(
                `El vehículo tiene ${viajesActivos} viaje(s) activo(s). ` +
                `Complete o cancele los viajes antes de iniciar el mantenimiento.`
            );
        }

        // Actualizar mantenimiento a EN_CURSO
        const mantenimientoActualizado = await mantenimientosRepository.update(id, {
            estado: 'EN_CURSO',
            taller,
            fechaInicio: new Date()
        });

        // Cambiar estado del vehículo a EN_MANTENIMIENTO
        await vehiculoRepository.update(mantenimiento.vehiculoId, {
            estado: EstadoVehiculo.EN_MANTENIMIENTO
        });

        // Auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Mantenimiento',
            entidadId: id,
            datosNuevos: { estado: 'EN_CURSO', taller }
        });

        return mantenimientoActualizado;
    },

    /**
     * Completar un mantenimiento EN_CURSO
     * Registra costos y devuelve el vehículo a ACTIVO
     */
    async completar(id: number, datos: DatosCompletarMantenimiento, usuarioId: number) {
        const mantenimiento = await prisma.mantenimiento.findUnique({ where: { id } });

        if (!mantenimiento) {
            throw new Error('Mantenimiento no encontrado');
        }

        if (mantenimiento.estado !== EstadoMantenimiento.EN_CURSO && mantenimiento.estado !== EstadoMantenimiento.PENDIENTE) {
            throw new Error('Solo se pueden completar mantenimientos en estado PENDIENTE o EN_CURSO');
        }

        const costoTotal = datos.costoManoObra + datos.costoRepuestos;
        let comprobanteId = mantenimiento.comprobanteId;

        // Subir comprobante si hay archivo nuevo
        if (datos.archivo) {
            const resultadoUpload = await uploadToCloudinary(
                datos.archivo.buffer,
                'comprobantes/mantenimientos',
                datos.archivo.originalname
            );

            const comprobante = await mantenimientosRepository.createComprobante({
                tipo: TipoComprobante.MANTENIMIENTO,
                url: resultadoUpload.url,
                publicId: resultadoUpload.publicId,
                nombreArchivoOriginal: datos.archivo.originalname
            });
            comprobanteId = comprobante.id;
        }

        // Calcular próximo mantenimiento: 90 días por defecto
        const DIAS_PROXIMO_MANTENIMIENTO = 90;
        let proximaFechaVehiculo: Date | null = null;

        // Si el usuario especificó una fecha próxima en el mantenimiento, usarla
        if (datos.proximoKilometraje) {
            // Si hay próximo km, no establecer fecha automática (se usa km)
            proximaFechaVehiculo = null;
        } else {
            // Calcular fecha automática
            proximaFechaVehiculo = new Date();
            proximaFechaVehiculo.setDate(proximaFechaVehiculo.getDate() + DIAS_PROXIMO_MANTENIMIENTO);
        }

        // Usar transacción para garantizar atomicidad
        const actualizado = await prisma.$transaction(async (tx) => {
            // 1. Actualizar mantenimiento
            const actualizado = await tx.mantenimiento.update({
                where: { id },
                data: {
                    estado: EstadoMantenimiento.COMPLETADO,
                    taller: datos.taller,
                    costoManoObra: datos.costoManoObra,
                    costoRepuestos: datos.costoRepuestos,
                    costoTotal,
                    descripcion: datos.descripcion || mantenimiento.descripcion,
                    fechaFin: new Date(),
                    kilometrajeAlMomento: datos.kilometrajeAlMomento || mantenimiento.kilometrajeAlMomento,
                    proximoKilometraje: datos.proximoKilometraje,
                    comprobanteId
                },
                include: { vehiculo: true }
            });

            // 2. Devolver vehículo a ACTIVO y programar próximo mantenimiento
            await tx.vehiculo.update({
                where: { id: mantenimiento.vehiculoId },
                data: {
                    estado: EstadoVehiculo.ACTIVO,
                    kilometrajeActual: datos.kilometrajeAlMomento || undefined,
                    fechaUltimoMantenimiento: new Date(),
                    fechaProximoMantenimiento: proximaFechaVehiculo
                }
            });

            return actualizado;
        });

        // Auditoría (fuera de la transacción)
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Mantenimiento',
            entidadId: id,
            datosNuevos: { estado: 'COMPLETADO', costoTotal }
        });

        return actualizado;
    },

    /**
     * Cancelar un mantenimiento PENDIENTE
     */
    async cancelar(id: number, usuarioId: number) {
        const mantenimiento = await prisma.mantenimiento.findUnique({ where: { id } });

        if (!mantenimiento) {
            throw new Error('Mantenimiento no encontrado');
        }

        if (mantenimiento.estado !== EstadoMantenimiento.PENDIENTE) {
            throw new Error('Solo se pueden cancelar mantenimientos en estado PENDIENTE');
        }

        const actualizado = await prisma.mantenimiento.update({
            where: { id },
            data: { estado: EstadoMantenimiento.CANCELADO }
        });

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Mantenimiento',
            entidadId: id,
            datosNuevos: { estado: 'CANCELADO' }
        });

        return actualizado;
    },

    async eliminar(id: number, usuarioId: number) {
        const mantenimiento = await mantenimientosRepository.findById(id);
        if (!mantenimiento) throw new Error('Mantenimiento no encontrado');

        // Eliminar comprobante de Cloudinary si existe
        if (mantenimiento.comprobante) {
            try {
                await deleteFromCloudinary(mantenimiento.comprobante.publicId);
            } catch (error) {
                console.error('Error eliminando comprobante maintenance:', error);
            }
        }

        await mantenimientosRepository.delete(id);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Mantenimiento',
            entidadId: id,
            datosNuevos: { estado: 'ELIMINADO' }
        });

        // Restaurar estado del vehículo a ACTIVO si estaba en mantenimiento
        const vehiculo = await prisma.vehiculo.findUnique({ where: { id: mantenimiento.vehiculoId } });
        if (vehiculo?.estado === EstadoVehiculo.EN_MANTENIMIENTO) {
            await prisma.vehiculo.update({
                where: { id: mantenimiento.vehiculoId },
                data: { estado: EstadoVehiculo.ACTIVO }
            });
        }

        return { mensaje: 'Mantenimiento eliminado' };
    }
};
