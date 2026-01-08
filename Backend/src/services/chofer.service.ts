// Servicio de Choferes - Lógica de negocio
import { z } from 'zod';
import { AccionAuditoria } from '@prisma/client';
import { choferRepository, FiltrosChofer } from '../repositories/chofer.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import prisma from '../config/database';

export const choferSchema = z.object({
    nombres: z.string().min(1, 'Nombres requeridos'),
    apellidos: z.string().min(1, 'Apellidos requeridos'),
    documentoId: z.string().min(1, 'Documento requerido'),
    telefono: z.string().optional().nullable(),
    correo: z.string().email().optional().nullable().or(z.literal('')),
    estado: z.enum(['ACTIVO', 'INACTIVO']).optional().default('ACTIVO'),
    fechaVencimientoLicencia: z.string().optional().nullable(),
    modalidadPago: z.enum(['POR_VIAJE', 'MENSUAL']).optional().default('POR_VIAJE'),
    metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA']).optional().default('EFECTIVO'),
    banco: z.string().optional().nullable(),
    numeroCuenta: z.string().optional().nullable(),
    sueldoMensual: z.coerce.number().min(0).optional().nullable(),
    fechaContratacion: z.string().optional().nullable(), // Nueva fecha de contratación
    diaPago: z.coerce.number().min(1).max(28).optional().nullable(), // Calculado automáticamente
    pagoQuincenal: z.boolean().optional().default(false)
});

export type ChoferInput = z.infer<typeof choferSchema>;

export const choferService = {
    async listar(filtros: FiltrosChofer) {
        return choferRepository.findAll(filtros);
    },

    async obtenerPorId(id: number) {
        return choferRepository.findById(id);
    },

    async crear(datos: ChoferInput, usuarioId: number, ip?: string) {
        const docNormalizado = datos.documentoId.trim();
        const existente = await choferRepository.findByDocumento(docNormalizado);
        if (existente) throw new Error(`Ya existe un chofer con el documento ${docNormalizado}`);

        // Validación para modalidad MENSUAL
        if (datos.modalidadPago === 'MENSUAL') {
            if (!datos.sueldoMensual || datos.sueldoMensual <= 0) {
                throw new Error('Para pago mensual, debe especificar un sueldo mensual válido');
            }
            if (!datos.fechaContratacion) {
                throw new Error('Para pago mensual, debe especificar la fecha de contratación');
            }
        }

        // Calcular diaPago automáticamente desde fechaContratacion
        const fechaContratacionDate = datos.fechaContratacion ? new Date(datos.fechaContratacion) : null;
        const diaPagoCalculado = fechaContratacionDate ? fechaContratacionDate.getDate() : null;

        const dataToSave = {
            nombres: datos.nombres.trim(),
            apellidos: datos.apellidos.trim(),
            documentoId: docNormalizado,
            telefono: datos.telefono?.trim() || null,
            correo: datos.correo?.trim() || null,
            estado: datos.estado || 'ACTIVO',
            fechaVencimientoLicencia: datos.fechaVencimientoLicencia ? new Date(datos.fechaVencimientoLicencia) : null,
            modalidadPago: datos.modalidadPago || 'POR_VIAJE',
            metodoPago: datos.metodoPago || 'EFECTIVO',
            banco: datos.banco?.trim() || null,
            numeroCuenta: datos.numeroCuenta?.trim() || null,
            sueldoMensual: datos.sueldoMensual || null,
            fechaContratacion: fechaContratacionDate,
            diaPago: diaPagoCalculado,
            pagoQuincenal: datos.pagoQuincenal || false
        };

        const chofer = await choferRepository.create(dataToSave);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Chofer',
            entidadId: chofer.id,
            datosNuevos: chofer,
            ipAddress: ip
        });

        return chofer;
    },

    async actualizar(id: number, datos: Partial<ChoferInput>, usuarioId: number, ip?: string) {
        const anterior = await choferRepository.findById(id);
        if (!anterior) throw new Error('Chofer no encontrado');

        if (datos.documentoId && datos.documentoId !== anterior.documentoId) {
            const existente = await choferRepository.findByDocumento(datos.documentoId);
            if (existente) throw new Error(`El documento ${datos.documentoId} ya está en uso`);
        }

        const dataToUpdate: any = {};
        if (datos.nombres) dataToUpdate.nombres = datos.nombres.trim();
        if (datos.apellidos) dataToUpdate.apellidos = datos.apellidos.trim();
        if (datos.documentoId) dataToUpdate.documentoId = datos.documentoId.trim();
        if (datos.telefono !== undefined) dataToUpdate.telefono = datos.telefono?.trim() || null;
        if (datos.correo !== undefined) dataToUpdate.correo = datos.correo?.trim() || null;
        if (datos.estado) dataToUpdate.estado = datos.estado;
        if (datos.fechaVencimientoLicencia !== undefined) {
            dataToUpdate.fechaVencimientoLicencia = datos.fechaVencimientoLicencia ? new Date(datos.fechaVencimientoLicencia) : null;
        }

        // NUEVO: Validar cambio a INACTIVO
        if (datos.estado === 'INACTIVO' && anterior.estado !== 'INACTIVO') {
            const viajesActivos = await prisma.viaje.count({
                where: { choferId: id, estado: { in: ['PLANIFICADO', 'EN_CURSO'] } }
            });
            if (viajesActivos > 0) {
                throw new Error(`No se puede desactivar: El chofer tiene ${viajesActivos} viaje(s) activo(s). Complete o cancele los viajes primero.`);
            }
        }

        if (datos.modalidadPago) dataToUpdate.modalidadPago = datos.modalidadPago;
        if (datos.metodoPago) dataToUpdate.metodoPago = datos.metodoPago;
        if (datos.banco !== undefined) dataToUpdate.banco = datos.banco?.trim() || null;
        if (datos.numeroCuenta !== undefined) dataToUpdate.numeroCuenta = datos.numeroCuenta?.trim() || null;
        if (datos.sueldoMensual !== undefined) dataToUpdate.sueldoMensual = datos.sueldoMensual || null;

        // Si se actualiza fechaContratacion, recalcular diaPago
        if (datos.fechaContratacion !== undefined) {
            const fechaContratacionDate = datos.fechaContratacion ? new Date(datos.fechaContratacion) : null;
            dataToUpdate.fechaContratacion = fechaContratacionDate;
            dataToUpdate.diaPago = fechaContratacionDate ? fechaContratacionDate.getDate() : null;
        }

        if (datos.pagoQuincenal !== undefined) dataToUpdate.pagoQuincenal = datos.pagoQuincenal || false;

        // Validación para modalidad MENSUAL (considerar datos actuales y nuevos)
        const modalidadFinal = datos.modalidadPago || anterior.modalidadPago;
        const sueldoFinal = datos.sueldoMensual !== undefined ? datos.sueldoMensual : anterior.sueldoMensual;
        const fechaContratacionFinal = datos.fechaContratacion !== undefined
            ? (datos.fechaContratacion ? new Date(datos.fechaContratacion) : null)
            : anterior.fechaContratacion;

        if (modalidadFinal === 'MENSUAL') {
            if (!sueldoFinal || Number(sueldoFinal) <= 0) {
                throw new Error('Para pago mensual, debe especificar un sueldo mensual válido');
            }
            if (!fechaContratacionFinal) {
                throw new Error('Para pago mensual, debe especificar la fecha de contratación');
            }
        }

        const chofer = await choferRepository.update(id, dataToUpdate);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Chofer',
            entidadId: id,
            datosAnteriores: anterior,
            datosNuevos: chofer,
            ipAddress: ip
        });

        return chofer;
    },

    async eliminar(id: number, usuarioId: number, ip?: string) {
        const chofer = await choferRepository.findById(id);
        if (!chofer) throw new Error('Chofer no encontrado');

        // Verificar viajes activos
        const viajesActivos = await prisma.viaje.count({
            where: {
                choferId: id,
                estado: { in: ['PLANIFICADO', 'EN_CURSO'] }
            }
        });

        if (viajesActivos > 0) {
            throw new Error(`No se puede eliminar: El chofer tiene ${viajesActivos} viaje(s) activo(s). Cancele o complete los viajes primero.`);
        }

        // Verificar saldo pendiente
        const pendientes = await this.obtenerViajesPendientes(id);
        const totalPendiente = pendientes.reduce((sum, v) => sum + v.pendiente, 0);

        if (totalPendiente > 0) {
            throw new Error(`No se puede eliminar: El chofer tiene $${totalPendiente.toFixed(2)} pendientes de pago.`);
        }

        await choferRepository.delete(id);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Chofer',
            entidadId: id,
            datosAnteriores: chofer,
            ipAddress: ip
        });

        return chofer;
    },

    async obtenerViajesPendientes(choferId: number) {
        // Buscar viajes COMPLETADOS de este chofer que tengan monto de pago definido
        // y donde la suma de pagos sea menor al monto acordado

        const viajes = await prisma.viaje.findMany({
            where: {
                choferId,
                estado: 'COMPLETADO',
                montoPagoChofer: { not: null } // Solo viajes con monto de pago acordado
            },
            include: {
                pagos: { select: { monto: true } },
                vehiculo: { select: { placa: true } }
            },
            orderBy: { fechaLlegadaReal: 'desc' }
        });

        // Filtrar solo los que tienen saldo pendiente
        const viajesConPendiente = viajes
            .map(viaje => {
                const montoPactado = Number(viaje.montoPagoChofer || 0);
                const totalPagado = viaje.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
                const pendiente = montoPactado - totalPagado;

                return {
                    id: viaje.id,
                    origen: viaje.origen,
                    destino: viaje.destino,
                    tarifa: viaje.tarifa,
                    fechaLlegadaReal: viaje.fechaLlegadaReal,
                    vehiculo: viaje.vehiculo,
                    montoPagoChofer: montoPactado,
                    totalPagado,
                    pendiente
                };
            })
            .filter(v => v.pendiente > 0); // Solo los que tienen saldo pendiente

        return viajesConPendiente;
    }
};
