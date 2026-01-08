import { EstadoViaje, AccionAuditoria, EstadoVehiculo } from '@prisma/client';
import { prisma } from '../config/database';
import { viajesRepository, FiltrosViajes, DatosCrearViaje, DatosActualizarViaje } from '../repositories/viajes.repository';
import { gastosRepository } from '../repositories/gastos.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { pagosChoferRepository } from '../repositories/pagosChofer.repository';

// Interfaz para resumen económico
export interface ResumenEconomico {
    ingreso: number;
    gastos: number;
    ganancia: number;
}

// Transiciones de estado válidas
const TRANSICIONES_VALIDAS: Record<EstadoViaje, EstadoViaje[]> = {
    PLANIFICADO: [EstadoViaje.EN_CURSO, EstadoViaje.CANCELADO],
    EN_CURSO: [EstadoViaje.COMPLETADO, EstadoViaje.CANCELADO],
    COMPLETADO: [], // Estado final
    CANCELADO: [], // Estado final
};

export const viajesService = {
    /**
     * Listar viajes con filtros y paginación
     */
    async listar(filtros: FiltrosViajes) {
        return viajesRepository.findAll(filtros);
    },

    /**
     * Obtener detalle de viaje con gastos y resumen económico
     */
    async obtenerDetalle(id: number) {
        const viaje = await viajesRepository.findById(id);

        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        // Calcular resumen económico completo
        const totalGastosViaticos = await gastosRepository.sumarGastosViaje(id);
        const ingreso = Number(viaje.tarifa);

        // COSTO Chofer (Pactado)
        const costoChoferPactado = viaje.montoPagoChofer ? Number(viaje.montoPagoChofer) : 0;

        // PAGADO Realmente (Cash Flow)
        const pagadoChoferReal = await pagosChoferRepository.sumarPagosPorViaje(id);

        // Gasto Efectivo Total (Lo que salió de caja) = Viáticos + Lo que ya le pagué
        const gastosEfectivos = totalGastosViaticos + pagadoChoferReal;

        // Ganancia "En Mano" (Cash Basis)
        const gananciaActual = ingreso - gastosEfectivos;

        // Balance Chofer
        const saldoPendienteChofer = costoChoferPactado - pagadoChoferReal;

        const resumenEconomico: ResumenEconomico = {
            ingreso,
            gastos: gastosEfectivos,
            ganancia: gananciaActual,
        };

        return {
            viaje,
            resumenEconomico,
            balanceChofer: {
                pactado: costoChoferPactado,
                pagado: pagadoChoferReal,
                pendiente: saldoPendienteChofer
            }
        };
    },

    /**
     * Crear un nuevo viaje
     */
    async crear(datos: DatosCrearViaje, usuarioId: number) {
        // Validar entidades relacionadas existen
        const validacion = await viajesRepository.validarEntidadesRelacionadas(
            datos.vehiculoId,
            datos.choferId,
            datos.clienteId,
            datos.materialId
        );

        if (!validacion.valido) {
            throw new Error(validacion.errores.join(', '));
        }

        // NUEVO: Validar estados de las entidades
        const vehiculoParaValidar = await prisma.vehiculo.findUnique({ where: { id: datos.vehiculoId } });
        const choferParaValidar = await prisma.chofer.findUnique({ where: { id: datos.choferId } });
        const clienteParaValidar = await prisma.cliente.findUnique({ where: { id: datos.clienteId } });

        // Validar estado del vehículo
        if (vehiculoParaValidar?.estado === 'INACTIVO') {
            throw new Error(`El vehículo ${vehiculoParaValidar.placa} está INACTIVO. Active el vehículo antes de asignar viajes.`);
        }
        if (vehiculoParaValidar?.estado === 'EN_MANTENIMIENTO') {
            throw new Error(`El vehículo ${vehiculoParaValidar.placa} está EN MANTENIMIENTO. Complete el mantenimiento antes de asignar viajes.`);
        }

        // Verificar si tiene mantenimiento EN_CURSO
        const mantEnCurso = await prisma.mantenimiento.findFirst({
            where: { vehiculoId: datos.vehiculoId, estado: 'EN_CURSO' }
        });
        if (mantEnCurso) {
            throw new Error(`El vehículo ${vehiculoParaValidar?.placa} tiene un mantenimiento en curso (ID: ${mantEnCurso.id}). Complete el mantenimiento primero.`);
        }

        // Validar estado del chofer
        if (choferParaValidar?.estado === 'INACTIVO') {
            throw new Error(`El chofer ${choferParaValidar.nombres} ${choferParaValidar.apellidos} está INACTIVO. Active el chofer antes de asignar viajes.`);
        }

        // Validar estado del cliente
        if (clienteParaValidar?.estado === 'INACTIVO') {
            throw new Error(`El cliente ${clienteParaValidar.nombreRazonSocial} está INACTIVO. Active el cliente antes de asignar viajes.`);
        }

        // Validar solapamiento de horarios (Vehículo y Chofer)
        const conflictos = await viajesRepository.checkSolapamiento(
            datos.fechaSalida,
            datos.fechaLlegadaEstimada,
            datos.vehiculoId,
            datos.choferId
        );

        if (conflictos.length > 0) {
            const conflicto = conflictos[0];
            const tipoConflicto = conflicto.vehiculoId === datos.vehiculoId ? 'El vehículo' : 'El chofer';
            throw new Error(`${tipoConflicto} ya tiene un viaje asignado en ese horario (Viaje #${conflicto.id})`);
        }

        // Validar fechas
        if (datos.fechaLlegadaEstimada && datos.fechaSalida >= datos.fechaLlegadaEstimada) {
            throw new Error('La fecha de salida debe ser anterior a la fecha de llegada estimada');
        }

        // Validar tarifa
        if (datos.tarifa <= 0) {
            throw new Error('La tarifa debe ser mayor a 0');
        }

        // Validar documentos del vehículo no estén vencidos
        const vehiculo = await prisma.vehiculo.findUnique({ where: { id: datos.vehiculoId } });
        if (vehiculo) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0); // Comparación solo por fecha

            const documentosVencidos: string[] = [];

            if (vehiculo.fechaVencimientoSoat && new Date(vehiculo.fechaVencimientoSoat) < hoy) {
                documentosVencidos.push('SOAT');
            }
            if (vehiculo.fechaVencimientoSeguro && new Date(vehiculo.fechaVencimientoSeguro) < hoy) {
                documentosVencidos.push('Seguro');
            }
            if (vehiculo.fechaVencimientoMatricula && new Date(vehiculo.fechaVencimientoMatricula) < hoy) {
                documentosVencidos.push('Matrícula');
            }

            if (documentosVencidos.length > 0) {
                throw new Error(`El vehículo ${vehiculo.placa} tiene documentos vencidos: ${documentosVencidos.join(', ')}. Actualice los documentos antes de asignar viajes.`);
            }
        }

        // Validar montoPagoChofer si el chofer es POR_VIAJE
        const chofer = await prisma.chofer.findUnique({ where: { id: datos.choferId } });

        // Validar licencia de chofer no esté vencida
        if (chofer?.fechaVencimientoLicencia) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (new Date(chofer.fechaVencimientoLicencia) < hoy) {
                throw new Error(`La licencia del chofer ${chofer.nombres} ${chofer.apellidos} está vencida. Actualice antes de asignar viajes.`);
            }
        }

        if (chofer?.modalidadPago === 'POR_VIAJE') {
            if (!datos.montoPagoChofer || datos.montoPagoChofer <= 0) {
                throw new Error('El monto a pagar al chofer es requerido para choferes con modalidad POR_VIAJE');
            }
        }

        // Crear viaje
        const viaje = await viajesRepository.create(datos);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Viaje',
            entidadId: viaje.id,
            datosNuevos: viaje,
        });

        return viaje;
    },

    /**
     * Actualizar datos de un viaje
     */
    async actualizar(id: number, datos: DatosActualizarViaje, usuarioId: number) {
        const viajeAnterior = await viajesRepository.findById(id);

        if (!viajeAnterior) {
            throw new Error('Viaje no encontrado');
        }

        // No permitir edición de viajes completados o cancelados, EXCEPTO si es para actualizar pago cliente
        const esActualizacionPago = Object.keys(datos).length <= 2 &&
            (datos.estadoPagoCliente !== undefined || datos.montoPagadoCliente !== undefined);

        if (!esActualizacionPago && (viajeAnterior.estado === EstadoViaje.COMPLETADO || viajeAnterior.estado === EstadoViaje.CANCELADO)) {
            throw new Error('No se puede editar un viaje completado o cancelado (solo se permite actualizar estado de cobro)');
        }

        const viajeActualizado = await viajesRepository.update(id, datos);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Viaje',
            entidadId: id,
            datosAnteriores: viajeAnterior,
            datosNuevos: viajeActualizado,
        });

        return viajeActualizado;
    },

    /**
     * Cambiar estado del viaje
     */
    async cambiarEstado(
        id: number,
        nuevoEstado: EstadoViaje,
        usuarioId: number,
        datosComplecion?: { fechaLlegadaReal?: Date; kilometrosReales?: number }
    ) {
        const viaje = await viajesRepository.findById(id);

        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        // Validar transición de estado
        const transicionesPermitidas = TRANSICIONES_VALIDAS[viaje.estado];
        if (!transicionesPermitidas.includes(nuevoEstado)) {
            throw new Error(
                `No se puede cambiar de estado ${viaje.estado} a ${nuevoEstado}`
            );
        }

        // Si se está completando, validar datos de compleción
        const datosActualizacion: DatosActualizarViaje = { estado: nuevoEstado };

        if (nuevoEstado === EstadoViaje.COMPLETADO) {
            if (!datosComplecion?.fechaLlegadaReal) {
                datosActualizacion.fechaLlegadaReal = new Date();
            } else {
                datosActualizacion.fechaLlegadaReal = datosComplecion.fechaLlegadaReal;
            }

            if (datosComplecion?.kilometrosReales) {
                datosActualizacion.kilometrosReales = datosComplecion.kilometrosReales;

                // FIX #7: Validar que el kilometraje real sea razonable
                const kmEstimados = viaje.kilometrosEstimados || 0;
                const kmReales = datosComplecion.kilometrosReales;

                if (kmEstimados > 0) {
                    // No puede ser menos del 30% del estimado (permite desviaciones)
                    if (kmReales < kmEstimados * 0.3) {
                        throw new Error(
                            `Kilometraje real (${kmReales} km) es sospechosamente bajo ` +
                            `para un viaje estimado en ${kmEstimados} km. Verifique los datos.`
                        );
                    }

                    // No debe exceder 3x el estimado (protección contra errores de digitación)
                    if (kmReales > kmEstimados * 3) {
                        throw new Error(
                            `Kilometraje real (${kmReales} km) excede significativamente ` +
                            `el estimado (${kmEstimados} km). Verifique los datos.`
                        );
                    }
                }
            }
        }

        // Usar transacción para garantizar atomicidad
        const viajeActualizado = await prisma.$transaction(async (tx) => {
            // 1. Actualizar viaje
            const viajeActualizado = await viajesRepository.update(id, datosActualizacion);

            // 2. Actualizar estado del vehículo según el estado del viaje
            if (nuevoEstado === EstadoViaje.EN_CURSO) {
                // Vehículo pasa a EN_RUTA cuando el viaje inicia
                await tx.vehiculo.update({
                    where: { id: viaje.vehiculoId },
                    data: { estado: EstadoVehiculo.EN_RUTA }
                });
            } else if (nuevoEstado === EstadoViaje.COMPLETADO || nuevoEstado === EstadoViaje.CANCELADO) {
                // Vehículo vuelve a ACTIVO
                const dataVehiculo: any = { estado: EstadoVehiculo.ACTIVO };

                // FIX #1: Si se completa y tenemos lectura de odómetro real, SUMAR al kilometraje actual
                if (nuevoEstado === EstadoViaje.COMPLETADO && datosActualizacion.kilometrosReales) {
                    // Obtener kilometraje actual del vehículo
                    const vehiculoActual = await tx.vehiculo.findUnique({
                        where: { id: viaje.vehiculoId },
                        select: { kilometrajeActual: true }
                    });

                    // SUMAR los kilómetros del viaje al odómetro total (no sobrescribir)
                    dataVehiculo.kilometrajeActual =
                        (vehiculoActual?.kilometrajeActual || 0) + datosActualizacion.kilometrosReales;
                }

                await tx.vehiculo.update({
                    where: { id: viaje.vehiculoId },
                    data: dataVehiculo
                });

                // FIX #4: AUTO-CREAR PAGO AL CHOFER al completar viaje (solo POR_VIAJE)
                if (nuevoEstado === EstadoViaje.COMPLETADO && viaje.montoPagoChofer && Number(viaje.montoPagoChofer) > 0) {
                    // Obtener datos del chofer
                    const chofer = await tx.chofer.findUnique({
                        where: { id: viaje.choferId }
                    });

                    // Solo crear pago automático para choferes POR_VIAJE
                    if (chofer?.modalidadPago === 'POR_VIAJE') {
                        // Verificar si ya existe un pago para este viaje
                        const pagoExistente = await tx.pagoChofer.findFirst({
                            where: { viajeId: viaje.id }
                        });

                        if (!pagoExistente) {
                            await tx.pagoChofer.create({
                                data: {
                                    choferId: viaje.choferId,
                                    viajeId: viaje.id,
                                    monto: Number(viaje.montoPagoChofer),
                                    fecha: datosActualizacion.fechaLlegadaReal || new Date(),
                                    metodoPago: chofer.metodoPago || 'EFECTIVO',
                                    descripcion: `${viaje.origen} - ${viaje.destino}`,
                                    estado: 'PENDIENTE'
                                }
                            });
                        }
                    }
                }
            }

            return viajeActualizado;
        });

        // Registrar auditoría (fuera de la transacción para no bloquear)
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Viaje',
            entidadId: id,
            datosAnteriores: { estado: viaje.estado },
            datosNuevos: { estado: nuevoEstado, ...datosActualizacion },
        });

        return viajeActualizado;
    },

    /**
     * Eliminar viaje (solo si está planificado)
     */
    async eliminar(id: number, usuarioId: number) {
        const viaje = await viajesRepository.findById(id);

        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        if (viaje.estado !== EstadoViaje.PLANIFICADO) {
            throw new Error('Solo se pueden eliminar viajes en estado PLANIFICADO');
        }

        await viajesRepository.delete(id);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Viaje',
            entidadId: id,
            datosAnteriores: viaje,
        });

        return { mensaje: 'Viaje eliminado correctamente' };
    },

    /**
     * Registrar pago del cliente (parcial o total)
     */
    async registrarPagoCliente(id: number, montoPago: number, usuarioId: number) {
        const viaje = await viajesRepository.findById(id);

        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        if (montoPago <= 0) {
            throw new Error('El monto del pago debe ser mayor a 0');
        }

        const tarifa = Number(viaje.tarifa);
        const montoPagadoActual = Number(viaje.montoPagadoCliente || 0);
        const nuevoMontoPagado = montoPagadoActual + montoPago;

        // Validar que no se pague más de lo que se debe
        if (nuevoMontoPagado > tarifa) {
            throw new Error(`El monto excede la deuda pendiente. Máximo a pagar: ${tarifa - montoPagadoActual}`);
        }

        // Determinar nuevo estado de pago
        let nuevoEstadoPago: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
        if (nuevoMontoPagado >= tarifa) {
            nuevoEstadoPago = 'PAGADO';
        } else if (nuevoMontoPagado > 0) {
            nuevoEstadoPago = 'PARCIAL';
        } else {
            nuevoEstadoPago = 'PENDIENTE';
        }

        const datosAntes = {
            montoPagadoCliente: montoPagadoActual,
            estadoPagoCliente: viaje.estadoPagoCliente
        };

        const viajeActualizado = await viajesRepository.update(id, {
            montoPagadoCliente: nuevoMontoPagado,
            estadoPagoCliente: nuevoEstadoPago
        });

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Viaje',
            entidadId: id,
            datosAnteriores: datosAntes,
            datosNuevos: {
                montoPagadoCliente: nuevoMontoPagado,
                estadoPagoCliente: nuevoEstadoPago,
                montoPagoRecibido: montoPago
            },
        });

        return {
            viaje: viajeActualizado,
            resumen: {
                tarifa,
                montoPagadoAntes: montoPagadoActual,
                montoPagoRecibido: montoPago,
                montoPagadoTotal: nuevoMontoPagado,
                saldoPendiente: tarifa - nuevoMontoPagado,
                estadoPago: nuevoEstadoPago
            }
        };
    },

    /**
     * Obtener estadísticas mensuales para dashboard
     */
    async obtenerEstadisticasMensuales(anio: number, mes: number) {
        return viajesRepository.getEstadisticasMensuales(anio, mes);
    },
};
