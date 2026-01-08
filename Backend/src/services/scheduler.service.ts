// Servicio de Tareas Programadas
// Ejecuta tareas automáticas en intervalos regulares

import prisma from '../config/database';
import { EstadoViaje, EstadoVehiculo, EstadoMantenimiento, TipoMantenimiento } from '@prisma/client';

// Configuración de intervalos (en milisegundos)
const INTERVALO_VERIFICACION_VIAJES = 60 * 1000; // Cada 1 minuto
const INTERVALO_VERIFICACION_MANTENIMIENTOS = 5 * 60 * 1000; // Cada 5 minutos

// Configuración de kilometraje para mantenimiento
const INTERVALO_MANTENIMIENTO_KM = 5000;
const KM_ALERTA_ANTES = 500;

/**
 * Actualiza viajes PLANIFICADO a EN_CURSO cuando llega la fecha de salida
 */
async function actualizarViajesPlanificados() {
    try {
        const ahora = new Date();

        // Buscar viajes planificados cuya fecha de salida ya pasó
        const viajesParaIniciar = await prisma.viaje.findMany({
            where: {
                estado: EstadoViaje.PLANIFICADO,
                fechaSalida: { lte: ahora }
            },
            include: {
                vehiculo: { select: { id: true, placa: true } }
            }
        });

        if (viajesParaIniciar.length > 0) {
            console.log(`🔄 [Scheduler] Encontrados ${viajesParaIniciar.length} viaje(s) para iniciar automáticamente`);

            for (const viaje of viajesParaIniciar) {
                // Actualizar viaje a EN_CURSO
                await prisma.viaje.update({
                    where: { id: viaje.id },
                    data: { estado: EstadoViaje.EN_CURSO }
                });

                // Actualizar vehículo a EN_RUTA
                await prisma.vehiculo.update({
                    where: { id: viaje.vehiculoId },
                    data: { estado: EstadoVehiculo.EN_RUTA }
                });

                console.log(`   ✅ Viaje #${viaje.id} iniciado automáticamente (Vehículo: ${viaje.vehiculo.placa})`);
            }
        }
    } catch (error) {
        console.error('[Scheduler] Error al actualizar viajes planificados:', error);
    }
}

/**
 * Crea mantenimientos PENDIENTE automáticamente para vehículos que lo necesitan
 */
async function crearMantenimientosPendientes() {
    try {
        // Obtener todos los vehículos activos con su último mantenimiento
        const vehiculos = await prisma.vehiculo.findMany({
            where: {
                estado: { in: [EstadoVehiculo.ACTIVO, EstadoVehiculo.EN_RUTA] }
            },
            include: {
                mantenimientos: {
                    orderBy: { fecha: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        kilometrajeAlMomento: true,
                        estado: true
                    }
                }
            }
        });

        let mantenimientosCreados = 0;

        for (const vehiculo of vehiculos) {
            const ultimoMant = vehiculo.mantenimientos[0];
            const kmUltimoMant = ultimoMant?.kilometrajeAlMomento || 0;
            const proximoMantKm = kmUltimoMant + INTERVALO_MANTENIMIENTO_KM;
            const kmParaProximoMant = proximoMantKm - vehiculo.kilometrajeActual;

            // Verificar si necesita mantenimiento (dentro de los 500km o ya pasó)
            const necesitaMantenimiento = kmParaProximoMant <= KM_ALERTA_ANTES;

            if (necesitaMantenimiento) {
                // Verificar si ya existe un mantenimiento PENDIENTE o EN_CURSO para este vehículo
                const mantenimientoExistente = await prisma.mantenimiento.findFirst({
                    where: {
                        vehiculoId: vehiculo.id,
                        estado: { in: [EstadoMantenimiento.PENDIENTE, EstadoMantenimiento.EN_CURSO] }
                    }
                });

                if (!mantenimientoExistente) {
                    // Crear mantenimiento PENDIENTE automáticamente
                    const esUrgente = kmParaProximoMant <= 0;

                    await prisma.mantenimiento.create({
                        data: {
                            vehiculoId: vehiculo.id,
                            tipo: TipoMantenimiento.PREVENTIVO,
                            estado: EstadoMantenimiento.PENDIENTE,
                            descripcion: esUrgente
                                ? `⚠️ URGENTE: Vehículo pasó ${Math.abs(kmParaProximoMant).toLocaleString()} km del intervalo de mantenimiento`
                                : `🔧 Mantenimiento preventivo - Faltan ${kmParaProximoMant.toLocaleString()} km para el próximo servicio`,
                            fecha: new Date(),
                            kilometrajeAlMomento: vehiculo.kilometrajeActual,
                            proximoKilometraje: vehiculo.kilometrajeActual + INTERVALO_MANTENIMIENTO_KM,
                            costoTotal: 0
                        }
                    });

                    mantenimientosCreados++;
                    console.log(`   🔧 Mantenimiento PENDIENTE creado para ${vehiculo.placa} (Km actual: ${vehiculo.kilometrajeActual.toLocaleString()})`);
                }
            }
        }

        if (mantenimientosCreados > 0) {
            console.log(`🔧 [Scheduler] ${mantenimientosCreados} mantenimiento(s) pendiente(s) creado(s) automáticamente`);
        }
    } catch (error) {
        console.error('[Scheduler] Error al crear mantenimientos pendientes:', error);
    }
}

/**
 * Genera pagos PENDIENTE para choferes mensuales
 * BASADO EN FECHA DE CONTRATACIÓN: El día de pago es el mismo día del mes que la fecha de contratación.
 * Genera recordatorios 3 días antes del día de pago.
 */
async function generarPagosMensuales() {
    try {
        const hoy = new Date();
        const diaActual = hoy.getDate();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        // Buscar TODOS los choferes MENSUAL activos con fecha de contratación
        const choferesMensuales = await prisma.chofer.findMany({
            where: {
                modalidadPago: 'MENSUAL',
                estado: 'ACTIVO',
                deletedAt: null,
                sueldoMensual: { not: null },
                fechaContratacion: { not: null }
            }
        });

        let pagosCreados = 0;

        // Función auxiliar para obtener nombre del mes TRABAJADO (el mes anterior al pago)
        // El pago de enero es por diciembre, el de febrero es por enero, etc.
        const obtenerMesTrabajado = (fechaPago: Date) => {
            const mesTrabajado = new Date(fechaPago);
            mesTrabajado.setMonth(mesTrabajado.getMonth() - 1); // Mes anterior
            return mesTrabajado.toLocaleString('es-EC', { month: 'long', year: 'numeric' })
                .replace(/^./, str => str.toUpperCase());
        };

        for (const chofer of choferesMensuales) {
            if (!chofer.sueldoMensual || !chofer.fechaContratacion) continue;

            // El día de pago es el día del mes de la fecha de contratación
            const fechaContratacion = new Date(chofer.fechaContratacion);
            const diaContratacion = fechaContratacion.getDate();

            // ========================================
            // 1. VERIFICAR PAGO DE QUINCENA (DÍA 15)
            // ========================================
            if (chofer.pagoQuincenal) {
                const fechaQuincena = new Date(anioActual, mesActual, 15);
                const diasParaQuincena = 15 - diaActual;

                // Solo generar quincena si el chofer fue contratado antes del día 12
                // (3 días antes del día 15)
                const fechaLimiteCreacionQuincena = new Date(anioActual, mesActual, 12);

                // Generar 3 días antes O si ya pasó la fecha (recuperación hasta 7 días)
                if (diasParaQuincena <= 3 && diasParaQuincena >= -7 && fechaContratacion < fechaLimiteCreacionQuincena) {
                    const montoQuincena = Number(chofer.sueldoMensual) / 2;

                    // Verificar si ya existe pago de quincena para este mes (por fecha, no por descripción)
                    const inicioMes = new Date(anioActual, mesActual, 1);
                    const finMes = new Date(anioActual, mesActual + 1, 0);

                    const pagoQuincenaExistente = await prisma.pagoChofer.findFirst({
                        where: {
                            choferId: chofer.id,
                            viajeId: null,
                            fecha: {
                                gte: inicioMes,
                                lte: finMes
                            },
                            descripcion: { contains: '1ra' }
                        }
                    });

                    if (!pagoQuincenaExistente) {
                        const mesQuincena = obtenerMesTrabajado(fechaQuincena);
                        await prisma.pagoChofer.create({
                            data: {
                                choferId: chofer.id,
                                monto: montoQuincena,
                                fecha: fechaQuincena,
                                metodoPago: chofer.metodoPago,
                                estado: 'PENDIENTE',
                                descripcion: `Pago quincenal (1ra) - ${mesQuincena}`
                            }
                        });
                        pagosCreados++;
                        console.log(`   💰 Quincena PENDIENTE: ${chofer.nombres} ${chofer.apellidos} - $${montoQuincena} (día 15)`);
                    }
                }
            }

            // ========================================
            // 2. VERIFICAR PAGO PRINCIPAL (DÍA DE CONTRATACIÓN DEL MES SIGUIENTE)
            // ========================================
            // El pago principal es el mismo día que la contratación, pero del mes actual
            const fechaPago = new Date(anioActual, mesActual, diaContratacion);
            const diasParaPago = diaContratacion - diaActual;

            // Fecha límite: el chofer debe haber sido contratado ANTES de 3 días antes del día de pago
            const fechaLimiteCreacion = new Date(anioActual, mesActual, diaContratacion - 3);

            // Generar 3 días antes O si ya pasó la fecha (recuperación hasta 7 días atrás)
            if (diasParaPago <= 3 && diasParaPago >= -7 && fechaContratacion < fechaLimiteCreacion) {
                // Si tiene pago quincenal, el pago del día configurado es solo 50%
                const montoAPagar = chofer.pagoQuincenal
                    ? Number(chofer.sueldoMensual) / 2
                    : Number(chofer.sueldoMensual);

                // Nombre del mes basado en la fecha del pago, no en la fecha actual
                const mesPago = obtenerMesTrabajado(fechaPago);
                const descripcionPago = chofer.pagoQuincenal
                    ? `Pago quincenal (2da) - ${mesPago}`
                    : `Salario mensual - ${mesPago}`;

                // Verificar si ya existe pago mensual para este mes (por rango de fecha del mes)
                const inicioMesPago = new Date(fechaPago.getFullYear(), fechaPago.getMonth(), 1);
                const finMesPago = new Date(fechaPago.getFullYear(), fechaPago.getMonth() + 1, 0);

                const pagoExistente = await prisma.pagoChofer.findFirst({
                    where: {
                        choferId: chofer.id,
                        viajeId: null,
                        fecha: {
                            gte: inicioMesPago,
                            lte: finMesPago
                        },
                        descripcion: {
                            contains: chofer.pagoQuincenal ? '2da' : 'Salario mensual'
                        }
                    }
                });

                if (!pagoExistente) {
                    await prisma.pagoChofer.create({
                        data: {
                            choferId: chofer.id,
                            monto: montoAPagar,
                            fecha: fechaPago,
                            metodoPago: chofer.metodoPago,
                            estado: 'PENDIENTE',
                            descripcion: descripcionPago
                        }
                    });
                    pagosCreados++;
                    console.log(`   💰 Pago PENDIENTE: ${chofer.nombres} ${chofer.apellidos} - $${montoAPagar} (día ${diaContratacion})`);
                }
            }
        }

        if (pagosCreados > 0) {
            console.log(`💰 [Scheduler] ${pagosCreados} pago(s) mensual(es) PENDIENTE(s) creado(s)`);
        }
    } catch (error) {
        console.error('[Scheduler] Error al generar pagos mensuales:', error);
    }
}


// Intervalo para verificar pagos mensuales (cada 1 hora para mayor robustez)
const INTERVALO_VERIFICACION_PAGOS = 1 * 60 * 60 * 1000;

/**
 * Inicia todas las tareas programadas
 */
export function iniciarTareasProgramadas() {
    console.log('⏰ Iniciando tareas programadas...');

    // Ejecutar una vez al inicio
    actualizarViajesPlanificados();
    crearMantenimientosPendientes();
    generarPagosMensuales();

    // Programar ejecución periódica
    setInterval(actualizarViajesPlanificados, INTERVALO_VERIFICACION_VIAJES);
    setInterval(crearMantenimientosPendientes, INTERVALO_VERIFICACION_MANTENIMIENTOS);
    setInterval(generarPagosMensuales, INTERVALO_VERIFICACION_PAGOS);

    console.log(`   📋 Verificación de viajes: cada ${INTERVALO_VERIFICACION_VIAJES / 1000} segundos`);
    console.log(`   🔧 Verificación de mantenimientos: cada ${INTERVALO_VERIFICACION_MANTENIMIENTOS / 1000} segundos`);
    console.log(`   💰 Verificación de pagos mensuales: cada ${INTERVALO_VERIFICACION_PAGOS / (60 * 60 * 1000)} horas`);
}

export default { iniciarTareasProgramadas };
