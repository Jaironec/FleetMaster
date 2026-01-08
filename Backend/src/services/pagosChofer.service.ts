// Servicio de Pagos a Choferes
import { TipoComprobante, AccionAuditoria } from '@prisma/client';
import { pagosChoferRepository, DatosCrearPagoChofer, FiltrosPagoChofer } from '../repositories/pagosChofer.repository';
import { choferService } from './chofer.service';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary.service';
import prisma from '../config/database'; // We need prisma for custom queries if not in repo, but for trip calcs maybe better here or in chofer service.

export interface DatosCrearPagoChoferConArchivo {
    choferId: number;
    monto: number;
    fecha: Date;
    metodoPago?: any; // Cast in Controller
    descripcion?: string;
    viajeId?: number;
    archivo?: {
        buffer: Buffer;
        originalname: string;
    };
}

export const pagoChoferService = {
    async listar(filtros: FiltrosPagoChofer) {
        return pagosChoferRepository.findAll(filtros);
    },

    async obtenerDetalle(id: number) {
        const pago = await pagosChoferRepository.findById(id);
        if (!pago) throw new Error('Pago no encontrado');
        return pago;
    },

    async crear(datos: DatosCrearPagoChoferConArchivo & { datosBancarios?: { banco: string; numeroCuenta: string } }, usuarioId: number) {
        // 1. Validar Chofer
        const chofer = await choferService.obtenerPorId(datos.choferId);
        if (!chofer) throw new Error('Chofer no encontrado');
        if (chofer.estado !== 'ACTIVO') {
            // throw new Error('El chofer no está activo'); // Comentado por flexibilidad, o mantener si es estricto
        }

        if (datos.monto <= 0) {
            throw new Error('El monto debe ser mayor a 0');
        }

        // 1.1 Si vienen datos bancarios, actualizar chofer
        if (datos.datosBancarios && datos.datosBancarios.banco && datos.datosBancarios.numeroCuenta) {
            await choferService.actualizar(datos.choferId, {
                banco: datos.datosBancarios.banco,
                numeroCuenta: datos.datosBancarios.numeroCuenta
            }, usuarioId);
        }

        let comprobanteId: number | undefined;

        // 2. Subir archivo
        if (datos.archivo) {
            const resultadoUpload = await uploadToCloudinary(
                datos.archivo.buffer,
                'comprobantes/pagos_choferes',
                datos.archivo.originalname
            );

            const comprobante = await pagosChoferRepository.createComprobante({
                tipo: TipoComprobante.PAGO_CHOFER,
                url: resultadoUpload.url,
                publicId: resultadoUpload.publicId,
                nombreArchivoOriginal: datos.archivo.originalname
            });
            comprobanteId = comprobante.id;
        }

        // 3. Validar Monto vs Deuda de Viaje (Si es pago por viaje)
        if (datos.viajeId) {
            const viaje = await prisma.viaje.findUnique({ where: { id: datos.viajeId } });
            if (!viaje) throw new Error('Viaje asociado no encontrado');

            const montoPactado = Number(viaje.montoPagoChofer || 0);

            // Sumar pagos previos de este viaje
            const pagosPrevios = await pagosChoferRepository.sumarPagosPorViaje(datos.viajeId);

            const totalConNuevoPago = pagosPrevios + datos.monto;

            // Margen de error pequeño por decimales
            if (totalConNuevoPago > (montoPactado + 0.01)) {
                throw new Error(`El pago excede el monto pactado para este viaje.
                    Pactado: $${montoPactado}
                    Pagado prev: $${pagosPrevios}
                    Intento actual: $${datos.monto}
                    Saldo restante: $${(montoPactado - pagosPrevios).toFixed(2)}`);
            }
        }

        // 4. Crear Pago
        const datosRepo: DatosCrearPagoChofer = {
            choferId: datos.choferId,
            monto: datos.monto,
            fecha: datos.fecha,
            metodoPago: datos.metodoPago,
            descripcion: datos.descripcion,
            viajeId: datos.viajeId
        };

        const pago = await pagosChoferRepository.create(datosRepo, comprobanteId);

        // 4. Auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'PagoChofer',
            entidadId: pago.id,
            datosNuevos: pago
        });

        return pago;
    },

    async eliminar(id: number, usuarioId: number) {
        const pago = await pagosChoferRepository.findById(id);
        if (!pago) throw new Error('Pago no encontrado');

        if (pago.comprobante) {
            try {
                await deleteFromCloudinary(pago.comprobante.publicId);
            } catch (e) {
                console.error('Error delete cloudinary:', e);
            }
        }

        await pagosChoferRepository.delete(id);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'PagoChofer',
            entidadId: id,
            datosAnteriores: pago
        });

        return { mensaje: 'Pago eliminado' };
    },

    // NUEVO: Marcar pago como pagado
    // NUEVO: Marcar pago como pagado (Total o Parcial)
    async marcarPagado(id: number, usuarioId: number, datos?: {
        monto?: number;
        fecha?: Date;
        metodoPago?: any;
        descripcion?: string;
        archivo?: { buffer: Buffer; originalname: string };
    }) {
        const pago = await pagosChoferRepository.findById(id);
        if (!pago) throw new Error('Pago no encontrado');

        if (pago.estado === 'PAGADO') {
            throw new Error('Este pago ya fue marcado como pagado');
        }

        const montoPendiente = Number(pago.monto);
        const montoPagar = datos?.monto ? Number(datos.monto) : montoPendiente;

        // Validar monto
        if (montoPagar > montoPendiente + 0.05) { // Margen 5 centavos
            throw new Error(`El monto a pagar ($${montoPagar}) excede el pendiente ($${montoPendiente})`);
        }

        if (montoPagar <= 0) throw new Error('El monto a pagar debe ser mayor a 0');

        // Subir comprobante si existe
        let comprobanteId: number | undefined;
        if (datos?.archivo) {
            const resultadoUpload = await uploadToCloudinary(
                datos.archivo.buffer,
                'comprobantes/pagos_choferes',
                datos.archivo.originalname
            );

            const comprobante = await pagosChoferRepository.createComprobante({
                tipo: TipoComprobante.PAGO_CHOFER,
                url: resultadoUpload.url,
                publicId: resultadoUpload.publicId,
                nombreArchivoOriginal: datos.archivo.originalname
            });
            comprobanteId = comprobante.id;
        }

        // Determinar si es Parcial o Total (con margen pequeño por float)
        const esParcial = (montoPendiente - montoPagar) > 0.05;
        
        // Usar transacción para garantizar atomicidad
        const pagoActualizado = await prisma.$transaction(async (tx) => {
            if (esParcial) {
                const saldoRestante = montoPendiente - montoPagar;

                // 1. Actualizar el pago actual a PAGADO con el monto que se está pagando
                const pagoActualizado = await tx.pagoChofer.update({
                    where: { id },
                    data: {
                        monto: montoPagar,
                        estado: 'PAGADO',
                        fechaPagoReal: datos?.fecha || new Date(),
                        metodoPago: datos?.metodoPago || pago.metodoPago,
                        descripcion: datos?.descripcion || pago.descripcion,
                        comprobanteId
                    },
                    include: { comprobante: true, chofer: true }
                });

                // 2. Crear nuevo registro por el saldo pendiente
                await tx.pagoChofer.create({
                    data: {
                        choferId: pago.choferId,
                        monto: saldoRestante,
                        fecha: pago.fecha, // Misma fecha programada
                        metodoPago: pago.metodoPago,
                        descripcion: `Saldo restante de pago #${pago.id}`,
                        viajeId: pago.viajeId,
                        estado: 'PENDIENTE'
                    }
                });

                return pagoActualizado;
            } else {
                // Pago Total
                return await tx.pagoChofer.update({
                    where: { id },
                    data: {
                        estado: 'PAGADO',
                        fechaPagoReal: datos?.fecha || new Date(),
                        metodoPago: datos?.metodoPago || pago.metodoPago,
                        descripcion: datos?.descripcion || undefined,
                        comprobanteId
                    },
                    include: { comprobante: true, chofer: true }
                });
            }
        });

        // Registrar auditoría (fuera de la transacción)
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'PagoChofer',
            entidadId: id,
            datosAnteriores: { estado: 'PENDIENTE', monto: montoPendiente },
            datosNuevos: {
                estado: 'PAGADO',
                montoPagado: montoPagar,
                esParcial,
                fechaPagoReal: pagoActualizado.fechaPagoReal
            }
        });

        return pagoActualizado;
    },

    // Lógica de Saldo del Chofer
    /**
     * Obtener resumen económico de un chofer
     * Calcula cuánto se le debe pagar y cuánto ya se le ha pagado
     */
    async obtenerResumenEconomico(choferId: number, fechaDesde?: Date, fechaHasta?: Date) {
        const chofer = await choferService.obtenerPorId(choferId);
        if (!chofer) {
            throw new Error('Chofer no encontrado');
        }

        let totalGenerado = 0;
        let totalPendiente = 0;

        if (chofer.modalidadPago === 'POR_VIAJE') {
            // Para POR_VIAJE: Sumar montoPagoChofer de viajes completados en el rango
            const whereViajes: any = {
                choferId,
                estado: 'COMPLETADO'
            };

            if (fechaDesde || fechaHasta) {
                whereViajes.fechaLlegadaReal = {};
                if (fechaDesde) whereViajes.fechaLlegadaReal.gte = fechaDesde;
                if (fechaHasta) whereViajes.fechaLlegadaReal.lte = fechaHasta;
            }

            const viajes = await prisma.viaje.findMany({
                where: whereViajes,
                select: { montoPagoChofer: true }
            });

            totalGenerado = viajes.reduce((acc, v) => acc + Number(v.montoPagoChofer || 0), 0);
        } else {
            // Para MENSUAL: Sumar montos de pagos generados (PENDIENTE + PAGADO)
            // El scheduler genera los pagos, así que el "total generado" son los pagos creados
            const wherePagos: any = {
                choferId,
                viajeId: null // Pagos mensuales no tienen viaje asociado
            };

            if (fechaDesde || fechaHasta) {
                wherePagos.fecha = {};
                if (fechaDesde) wherePagos.fecha.gte = fechaDesde;
                if (fechaHasta) wherePagos.fecha.lte = fechaHasta;
            }

            const pagosGenerados = await prisma.pagoChofer.findMany({
                where: wherePagos,
                select: { monto: true, estado: true }
            });

            totalGenerado = pagosGenerados.reduce((acc, p) => acc + Number(p.monto || 0), 0);
            totalPendiente = pagosGenerados
                .filter(p => p.estado === 'PENDIENTE')
                .reduce((acc, p) => acc + Number(p.monto || 0), 0);
        }

        // Para POR_VIAJE, calcular pagado normalmente
        const totalPagado = chofer.modalidadPago === 'POR_VIAJE' 
            ? await pagosChoferRepository.sumarPagos(choferId, fechaDesde, fechaHasta)
            : totalGenerado - totalPendiente;

        // Para MENSUAL, saldoPendiente es la suma de pagos con estado PENDIENTE
        const saldoPendiente = chofer.modalidadPago === 'MENSUAL' 
            ? totalPendiente
            : totalGenerado - totalPagado;

        return {
            totalGenerado,
            totalPagado,
            saldoPendiente,
            modalidadPago: chofer.modalidadPago,
            sueldoMensual: chofer.modalidadPago === 'MENSUAL' ? Number(chofer.sueldoMensual) : null,
            diaPago: chofer.modalidadPago === 'MENSUAL' ? chofer.diaPago : null,
            pagoQuincenal: chofer.modalidadPago === 'MENSUAL' ? chofer.pagoQuincenal : null
        };
    },
};
