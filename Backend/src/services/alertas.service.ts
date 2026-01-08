// Servicio de Alertas - Documentos, Mantenimientos, Choferes, Facturas
import prisma from '../config/database';

// Configuración de umbrales
const DIAS_ALERTA_DOCUMENTOS = 30; // Alertar 30 días antes del vencimiento
const DIAS_ALERTA_MANTENIMIENTO = 15; // Alertar 15 días antes de mantenimiento
const UMBRAL_SALDO_CHOFER = 500; // Alertar si el saldo pendiente supera $500

interface AlertaDocumento {
    vehiculoId: number;
    placa: string;
    tipoDocumento: 'SOAT' | 'SEGURO' | 'MATRICULA';
    fechaVencimiento: Date;
    diasRestantes: number;
    // FIX #11: Agregar campos para distinguir estado
    estaVencido: boolean;
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
    mensaje: string;
}

interface AlertaMantenimiento {
    vehiculoId: number;
    placa: string;
    motivo: 'FECHA' | 'KILOMETRAJE' | 'PENDIENTE';
    proximoMantenimientoFecha: Date | null;
    proximoMantenimientoKm: number | null;
    kilometrajeActual: number;
    diasRestantes: number | null;
    kmRestantes: number | null;
}

interface AlertaChofer {
    choferId: number;
    nombre: string;
    totalGenerado: number;
    totalPagado: number;
    saldoPendiente: number;
}

interface AlertaFactura {
    viajeId: number;
    cliente: string;
    ruta: string;
    tarifa: number;
    montoPagado: number;
    saldoPendiente: number;
    fechaLimitePago: Date;
    diasVencido: number;
}

interface AlertaLicenciaChofer {
    choferId: number;
    nombre: string;
    fechaVencimiento: Date;
    diasRestantes: number;
}

// NUEVO: Alertas de pagos mensuales pendientes
interface AlertaPagoChofer {
    pagoId: number;
    choferId: number;
    nombreChofer: string;
    monto: number;
    fechaPago: Date;
    descripcion: string;
    diasParaPago: number;
}

// NUEVO: Alertas de viajes próximos (48h)
interface AlertaViajeProximo {
    viajeId: number;
    placa: string;
    chofer: string;
    cliente: string;
    origen: string;
    destino: string;
    fechaSalida: Date;
    horasRestantes: number;
}

// NUEVO: Pagos de viajes pendientes (por viaje)
interface AlertaPagoViaje {
    pagoId: number;
    viajeId: number;
    chofer: string;
    ruta: string;
    monto: number;
    fechaViaje: Date;
    diasPendiente: number;
}

export const alertasService = {
    /**
     * Obtener todas las alertas del sistema
     */
    async obtenerAlertas() {
        const [documentos, mantenimiento, choferes, facturas, licencias, pagosChoferes, viajesProximos, pagosViajes] = await Promise.all([
            this.obtenerAlertasDocumentos(),
            this.obtenerAlertasMantenimiento(),
            this.obtenerAlertasChoferes(),
            this.obtenerAlertasFacturas(),
            this.obtenerAlertasLicenciasChoferes(),
            this.obtenerAlertasPagosChoferes(),
            this.obtenerAlertasViajesProximos(),
            this.obtenerAlertasPagosViajesPendientes()
        ]);

        return {
            vehiculosDocumentosPorVencer: documentos,
            vehiculosMantenimientoPendiente: mantenimiento,
            choferesConSaldoAlto: choferes,
            facturasVencidas: facturas,
            licenciasChoferPorVencer: licencias,
            pagosMensualesPendientes: pagosChoferes,
            viajesProximos: viajesProximos,
            pagosViajesPendientes: pagosViajes,
            resumen: {
                documentos: documentos.length,
                mantenimiento: mantenimiento.length,
                choferesSaldo: choferes.length,
                facturas: facturas.length,
                licencias: licencias.length,
                pagosChoferes: pagosChoferes.length,
                viajesProximos: viajesProximos.length,
                pagosViajes: pagosViajes.length,
                total: documentos.length + mantenimiento.length + choferes.length + facturas.length + licencias.length + pagosChoferes.length + viajesProximos.length + pagosViajes.length
            }
        };
    },

    /**
     * Alertas de documentos de vehículos por vencer (SOAT, Seguro, Matrícula)
     */
    async obtenerAlertasDocumentos(): Promise<AlertaDocumento[]> {
        const hoy = new Date();
        const fechaLimite = new Date();
        fechaLimite.setDate(hoy.getDate() + DIAS_ALERTA_DOCUMENTOS);

        // Buscar vehículos con documentos por vencer
        const vehiculos = await prisma.vehiculo.findMany({
            where: {
                estado: { not: 'INACTIVO' },
                OR: [
                    { fechaVencimientoSoat: { lte: fechaLimite, gte: hoy } },
                    { fechaVencimientoSeguro: { lte: fechaLimite, gte: hoy } },
                    { fechaVencimientoMatricula: { lte: fechaLimite, gte: hoy } },
                    // También incluir ya vencidos
                    { fechaVencimientoSoat: { lt: hoy } },
                    { fechaVencimientoSeguro: { lt: hoy } },
                    { fechaVencimientoMatricula: { lt: hoy } }
                ]
            },
            select: {
                id: true,
                placa: true,
                fechaVencimientoSoat: true,
                fechaVencimientoSeguro: true,
                fechaVencimientoMatricula: true
            }
        });

        const alertas: AlertaDocumento[] = [];

        for (const v of vehiculos) {
            // FIX #11: Verificar SOAT con estado detallado
            if (v.fechaVencimientoSoat && v.fechaVencimientoSoat <= fechaLimite) {
                const dias = Math.ceil((v.fechaVencimientoSoat.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                const estaVencido = dias < 0;
                let prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
                let mensaje: string;

                if (estaVencido) {
                    prioridad = 'ALTA';
                    mensaje = `⚠️ SOAT VENCIDO hace ${Math.abs(dias)} día(s)`;
                } else if (dias <= 7) {
                    prioridad = 'ALTA';
                    mensaje = `SOAT vence en ${dias} día(s) - URGENTE`;
                } else if (dias <= 15) {
                    prioridad = 'MEDIA';
                    mensaje = `SOAT vence en ${dias} día(s)`;
                } else {
                    prioridad = 'BAJA';
                    mensaje = `SOAT vence en ${dias} día(s)`;
                }

                alertas.push({
                    vehiculoId: v.id,
                    placa: v.placa,
                    tipoDocumento: 'SOAT',
                    fechaVencimiento: v.fechaVencimientoSoat,
                    diasRestantes: dias,
                    estaVencido,
                    prioridad,
                    mensaje
                });
            }

            // FIX #11: Verificar Seguro con estado detallado
            if (v.fechaVencimientoSeguro && v.fechaVencimientoSeguro <= fechaLimite) {
                const dias = Math.ceil((v.fechaVencimientoSeguro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                const estaVencido = dias < 0;
                let prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
                let mensaje: string;

                if (estaVencido) {
                    prioridad = 'ALTA';
                    mensaje = `⚠️ SEGURO VENCIDO hace ${Math.abs(dias)} día(s)`;
                } else if (dias <= 7) {
                    prioridad = 'ALTA';
                    mensaje = `SEGURO vence en ${dias} día(s) - URGENTE`;
                } else if (dias <= 15) {
                    prioridad = 'MEDIA';
                    mensaje = `SEGURO vence en ${dias} día(s)`;
                } else {
                    prioridad = 'BAJA';
                    mensaje = `SEGURO vence en ${dias} día(s)`;
                }

                alertas.push({
                    vehiculoId: v.id,
                    placa: v.placa,
                    tipoDocumento: 'SEGURO',
                    fechaVencimiento: v.fechaVencimientoSeguro,
                    diasRestantes: dias,
                    estaVencido,
                    prioridad,
                    mensaje
                });
            }

            // FIX #11: Verificar Matrícula con estado detallado
            if (v.fechaVencimientoMatricula && v.fechaVencimientoMatricula <= fechaLimite) {
                const dias = Math.ceil((v.fechaVencimientoMatricula.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                const estaVencido = dias < 0;
                let prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
                let mensaje: string;

                if (estaVencido) {
                    prioridad = 'ALTA';
                    mensaje = `⚠️ MATRÍCULA VENCIDA hace ${Math.abs(dias)} día(s)`;
                } else if (dias <= 7) {
                    prioridad = 'ALTA';
                    mensaje = `MATRÍCULA vence en ${dias} día(s) - URGENTE`;
                } else if (dias <= 15) {
                    prioridad = 'MEDIA';
                    mensaje = `MATRÍCULA vence en ${dias} día(s)`;
                } else {
                    prioridad = 'BAJA';
                    mensaje = `MATRÍCULA vence en ${dias} día(s)`;
                }

                alertas.push({
                    vehiculoId: v.id,
                    placa: v.placa,
                    tipoDocumento: 'MATRICULA',
                    fechaVencimiento: v.fechaVencimientoMatricula,
                    diasRestantes: dias,
                    estaVencido,
                    prioridad,
                    mensaje
                });
            }
        }

        // Ordenar por días restantes (más urgentes primero)
        return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
    },

    /**
     * Alertas de vehículos con mantenimiento pendiente (por fecha o kilometraje)
     * Intervalos típicos de mantenimiento:
     * - Cambio de aceite: cada 5,000 km
     * - Servicio menor: cada 10,000 km
     * - Servicio mayor: cada 30,000 km
     */
    async obtenerAlertasMantenimiento(): Promise<AlertaMantenimiento[]> {
        const hoy = new Date();
        const fechaLimite = new Date();
        fechaLimite.setDate(hoy.getDate() + DIAS_ALERTA_MANTENIMIENTO);

        // Configuración de kilometraje
        const INTERVALO_MANTENIMIENTO_KM = 5000; // Cada 5,000 km
        const KM_ALERTA_ANTES = 500; // Alertar 500 km antes

        // Buscar todos los vehículos activos
        const vehiculos = await prisma.vehiculo.findMany({
            where: {
                estado: { not: 'INACTIVO' }
            },
            select: {
                id: true,
                placa: true,
                fechaProximoMantenimiento: true,
                fechaUltimoMantenimiento: true,
                kilometrajeActual: true,
                mantenimientos: {
                    orderBy: { fecha: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        kilometrajeAlMomento: true,
                        estado: true
                    }
                }
            }
        });

        const alertas: AlertaMantenimiento[] = [];

        for (const v of vehiculos) {
            // --- ALERTA POR FECHA ---
            if (v.fechaProximoMantenimiento && v.fechaProximoMantenimiento <= fechaLimite) {
                const dias = Math.ceil((v.fechaProximoMantenimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                alertas.push({
                    vehiculoId: v.id,
                    placa: v.placa,
                    motivo: 'FECHA',
                    proximoMantenimientoFecha: v.fechaProximoMantenimiento,
                    proximoMantenimientoKm: null,
                    kilometrajeActual: v.kilometrajeActual,
                    diasRestantes: dias,
                    kmRestantes: null
                });
            }

            // --- ALERTA POR KILOMETRAJE ---
            // Calcular basado en el último COMPLETADO
            const ultimoMantCompletado = v.mantenimientos.find(m => m.estado === 'COMPLETADO');
            const kmUltimoMantenimiento = ultimoMantCompletado?.kilometrajeAlMomento || 0;
            const proximoMantenimientoKm = kmUltimoMantenimiento + INTERVALO_MANTENIMIENTO_KM;
            const kmRestantes = proximoMantenimientoKm - v.kilometrajeActual;

            // Verificar si tiene uno pendiente
            const ultimoMant = v.mantenimientos[0];
            const tienePendiente = ultimoMant && (ultimoMant.estado === 'PENDIENTE' || ultimoMant.estado === 'EN_CURSO');

            if (tienePendiente) {
                console.log(`[Alertas] Vehiculo ${v.placa} tiene mantenimiento pendiente. ID: ${ultimoMant.id}, Estado: ${ultimoMant.estado}`);
            }

            // Si estamos dentro de los 500 km antes del próximo mantenimiento O tiene uno PENDIENTE
            if ((kmRestantes <= KM_ALERTA_ANTES && kmRestantes > -INTERVALO_MANTENIMIENTO_KM) || tienePendiente) {
                // Evitar duplicados si ya tiene alerta por fecha
                const yaExiste = alertas.some(a => a.vehiculoId === v.id);
                if (!yaExiste) {
                    alertas.push({
                        vehiculoId: v.id,
                        placa: v.placa,
                        motivo: tienePendiente ? 'PENDIENTE' : 'KILOMETRAJE',
                        proximoMantenimientoFecha: null,
                        proximoMantenimientoKm: proximoMantenimientoKm,
                        kilometrajeActual: v.kilometrajeActual,
                        diasRestantes: null,
                        kmRestantes: kmRestantes
                    });
                } else {
                    // Si ya existe, actualizar para agregar info de km
                    const alertaExistente = alertas.find(a => a.vehiculoId === v.id);
                    if (alertaExistente) {
                        alertaExistente.proximoMantenimientoKm = proximoMantenimientoKm;
                        alertaExistente.kmRestantes = kmRestantes;
                        if (tienePendiente) alertaExistente.motivo = 'PENDIENTE';
                    }
                }
            }

            // --- ALERTA SI NUNCA HA TENIDO MANTENIMIENTO Y YA TIENE MÁS DE 5,000 km ---
            if (v.mantenimientos.length === 0 && v.kilometrajeActual >= INTERVALO_MANTENIMIENTO_KM - KM_ALERTA_ANTES) {
                const yaExiste = alertas.some(a => a.vehiculoId === v.id);
                if (!yaExiste) {
                    alertas.push({
                        vehiculoId: v.id,
                        placa: v.placa,
                        motivo: 'KILOMETRAJE',
                        proximoMantenimientoFecha: null,
                        proximoMantenimientoKm: INTERVALO_MANTENIMIENTO_KM,
                        kilometrajeActual: v.kilometrajeActual,
                        diasRestantes: null,
                        kmRestantes: INTERVALO_MANTENIMIENTO_KM - v.kilometrajeActual
                    });
                }
            }
        }

        // Ordenar: primero por km restantes (urgentes), luego por días
        return alertas.sort((a, b) => {
            // Si ambos tienen km, ordenar por km
            if (a.kmRestantes !== null && b.kmRestantes !== null) {
                return a.kmRestantes - b.kmRestantes;
            }
            // Si ambos tienen días, ordenar por días
            if (a.diasRestantes !== null && b.diasRestantes !== null) {
                return a.diasRestantes - b.diasRestantes;
            }
            // Priorizar los de km sobre los de fecha
            if (a.kmRestantes !== null) return -1;
            if (b.kmRestantes !== null) return 1;
            return 0;
        });
    },

    /**
     * Alertas de choferes con saldo pendiente alto
     */
    async obtenerAlertasChoferes(): Promise<AlertaChofer[]> {
        // Obtener todos los choferes activos
        const choferes = await prisma.chofer.findMany({
            where: { estado: 'ACTIVO' },
            select: {
                id: true,
                nombres: true,
                apellidos: true
            }
        });

        const alertas: AlertaChofer[] = [];

        for (const chofer of choferes) {
            // Calcular viajes completados y su valor
            const viajesCompletados = await prisma.viaje.findMany({
                where: {
                    choferId: chofer.id,
                    estado: 'COMPLETADO'
                },
                select: {
                    montoPagoChofer: true
                }
            });

            const totalGenerado = viajesCompletados.reduce(
                (sum, v) => sum + Number(v.montoPagoChofer || 0),
                0
            );

            // Calcular pagos realizados
            const pagosRealizados = await prisma.pagoChofer.aggregate({
                where: { choferId: chofer.id },
                _sum: { monto: true }
            });

            const totalPagado = Number(pagosRealizados._sum.monto || 0);
            const saldoPendiente = totalGenerado - totalPagado;

            // Si supera el umbral, agregar a alertas
            if (saldoPendiente >= UMBRAL_SALDO_CHOFER) {
                alertas.push({
                    choferId: chofer.id,
                    nombre: `${chofer.nombres} ${chofer.apellidos}`,
                    totalGenerado,
                    totalPagado,
                    saldoPendiente
                });
            }
        }

        // Ordenar por saldo pendiente (mayor primero)
        return alertas.sort((a, b) => b.saldoPendiente - a.saldoPendiente);
    },

    /**
     * Alertas de facturas vencidas (viajes con fecha límite de pago excedida)
     */
    async obtenerAlertasFacturas(): Promise<AlertaFactura[]> {
        const hoy = new Date();

        // Buscar viajes con fecha límite de pago vencida que no estén pagados
        const viajesVencidos = await prisma.viaje.findMany({
            where: {
                fechaLimitePago: { lt: hoy },
                estadoPagoCliente: { not: 'PAGADO' }
            },
            select: {
                id: true,
                origen: true,
                destino: true,
                tarifa: true,
                montoPagadoCliente: true,
                fechaLimitePago: true,
                cliente: {
                    select: { nombreRazonSocial: true }
                }
            },
            orderBy: { fechaLimitePago: 'asc' }
        });

        return viajesVencidos.map(v => {
            const diasVencido = Math.ceil((hoy.getTime() - (v.fechaLimitePago?.getTime() || 0)) / (1000 * 60 * 60 * 24));
            return {
                viajeId: v.id,
                cliente: v.cliente.nombreRazonSocial,
                ruta: `${v.origen} → ${v.destino}`,
                tarifa: Number(v.tarifa),
                montoPagado: Number(v.montoPagadoCliente || 0),
                saldoPendiente: Number(v.tarifa) - Number(v.montoPagadoCliente || 0),
                fechaLimitePago: v.fechaLimitePago!,
                diasVencido
            };
        });
    },

    /**
     * Alertas de licencias de choferes por vencer o vencidas
     */
    async obtenerAlertasLicenciasChoferes(): Promise<AlertaLicenciaChofer[]> {
        const hoy = new Date();
        const fechaLimite = new Date();
        fechaLimite.setDate(hoy.getDate() + DIAS_ALERTA_DOCUMENTOS); // 30 días

        // Buscar choferes activos con licencia por vencer o ya vencida
        const choferes = await prisma.chofer.findMany({
            where: {
                estado: 'ACTIVO',
                fechaVencimientoLicencia: { lte: fechaLimite }
            },
            select: {
                id: true,
                nombres: true,
                apellidos: true,
                fechaVencimientoLicencia: true
            }
        });

        return choferes
            .filter(c => c.fechaVencimientoLicencia !== null)
            .map(c => {
                const dias = Math.ceil((c.fechaVencimientoLicencia!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                return {
                    choferId: c.id,
                    nombre: `${c.nombres} ${c.apellidos}`,
                    fechaVencimiento: c.fechaVencimientoLicencia!,
                    diasRestantes: dias
                };
            })
            .sort((a, b) => a.diasRestantes - b.diasRestantes); // Más urgentes primero
    },

    /**
     * Alertas de pagos mensuales de choferes PENDIENTES
     * Muestra pagos que están próximos a vencer o ya vencidos
     */
    async obtenerAlertasPagosChoferes(): Promise<AlertaPagoChofer[]> {
        const hoy = new Date();

        // Buscar pagos PENDIENTE de choferes mensuales
        const pagosPendientes = await prisma.pagoChofer.findMany({
            where: {
                estado: 'PENDIENTE',
                viajeId: null, // Solo pagos mensuales (sin viaje asociado)
            },
            include: {
                chofer: {
                    select: {
                        id: true,
                        nombres: true,
                        apellidos: true
                    }
                }
            },
            orderBy: { fecha: 'asc' }
        });

        return pagosPendientes.map(pago => {
            const fechaPago = new Date(pago.fecha);
            const diasParaPago = Math.ceil((fechaPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

            return {
                pagoId: pago.id,
                choferId: pago.chofer.id,
                nombreChofer: `${pago.chofer.nombres} ${pago.chofer.apellidos}`,
                monto: Number(pago.monto),
                fechaPago: fechaPago,
                descripcion: pago.descripcion || 'Pago mensual',
                diasParaPago: diasParaPago
            };
        });
    },

    /**
     * Alertas de viajes próximos (48 horas)
     * Muestra viajes planificados que saldrán pronto
     */
    async obtenerAlertasViajesProximos(): Promise<AlertaViajeProximo[]> {
        const ahora = new Date();
        const en48Horas = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

        const viajesProximos = await prisma.viaje.findMany({
            where: {
                estado: 'PLANIFICADO',
                fechaSalida: {
                    gte: ahora,
                    lte: en48Horas
                }
            },
            include: {
                vehiculo: { select: { placa: true } },
                chofer: { select: { nombres: true, apellidos: true } },
                cliente: { select: { nombreRazonSocial: true } }
            },
            orderBy: { fechaSalida: 'asc' }
        });

        return viajesProximos.map(viaje => {
            const horasRestantes = Math.round((new Date(viaje.fechaSalida).getTime() - ahora.getTime()) / (1000 * 60 * 60));
            return {
                viajeId: viaje.id,
                placa: viaje.vehiculo.placa,
                chofer: `${viaje.chofer.nombres} ${viaje.chofer.apellidos}`,
                cliente: viaje.cliente.nombreRazonSocial,
                origen: viaje.origen,
                destino: viaje.destino,
                fechaSalida: viaje.fechaSalida,
                horasRestantes: horasRestantes
            };
        });
    },

    /**
     * Alertas de pagos de viajes pendientes
     * Muestra pagos de viajes completados que están pendientes de pago
     */
    async obtenerAlertasPagosViajesPendientes(): Promise<AlertaPagoViaje[]> {
        const hoy = new Date();

        const pagosPendientes = await prisma.pagoChofer.findMany({
            where: {
                estado: 'PENDIENTE',
                viajeId: { not: null }
            },
            include: {
                chofer: { select: { nombres: true, apellidos: true } },
                viaje: { select: { origen: true, destino: true, fechaSalida: true } }
            },
            orderBy: { fecha: 'asc' },
            take: 20 // Limitar a los 20 más antiguos
        });

        return pagosPendientes.map(pago => {
            const fechaViaje = pago.viaje?.fechaSalida ? new Date(pago.viaje.fechaSalida) : new Date(pago.fecha);
            const diasPendiente = Math.ceil((hoy.getTime() - fechaViaje.getTime()) / (1000 * 60 * 60 * 24));

            return {
                pagoId: pago.id,
                viajeId: pago.viajeId!,
                chofer: `${pago.chofer.nombres} ${pago.chofer.apellidos}`,
                ruta: pago.viaje ? `${pago.viaje.origen} → ${pago.viaje.destino}` : 'N/A',
                monto: Number(pago.monto),
                fechaViaje: fechaViaje,
                diasPendiente: diasPendiente
            };
        });
    }
};
