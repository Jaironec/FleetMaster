// Servicio de Reportes
import prisma from '../config/database';
import { mantenimientosRepository } from '../repositories/mantenimiento.repository';
import { gastosRepository } from '../repositories/gastos.repository';
import { pagosChoferRepository } from '../repositories/pagosChofer.repository';

export const reportesService = {
    // 1. Reporte por Vehículo
    async reportePorVehiculo(vehiculoId: number, fechaDesde: Date, fechaHasta: Date) {
        const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
        if (!vehiculo) throw new Error('Vehículo no encontrado');

        // Ingresos por Viajes (Completados)
        const viajes = await prisma.viaje.findMany({
            where: {
                vehiculoId,
                estado: 'COMPLETADO',
                estadoPagoCliente: 'PAGADO',
                fechaLlegadaReal: { gte: fechaDesde, lte: fechaHasta }
            },
            select: {
                id: true,
                tarifa: true,
                montoPagoChofer: true,
                choferId: true
            }
        });
        const ingresosViajes = viajes.reduce((acc, v) => acc + Number(v.tarifa), 0);

        // Gastos Viáticos (GastosViaje asociados a esos viajes)
        let gastosViaticos = 0;
        for (const v of viajes) {
            gastosViaticos += await gastosRepository.sumarGastosViaje(v.id);
        }

        // Pagos a Choferes (montos de pago de viajes completados)
        const pagosChoferes = viajes.reduce((acc, v) => acc + Number(v.montoPagoChofer || 0), 0);

        // Gastos Mantenimientos (en el rango de fechas)
        const gastosMantenimientos = await mantenimientosRepository.sumarCostos(vehiculoId, fechaDesde, fechaHasta);

        // Gastos totales: viáticos + pagos choferes + mantenimientos
        const gastosTotales = gastosViaticos + pagosChoferes + gastosMantenimientos;

        // Ganancia neta = Ingresos - Todos los gastos
        const gananciaNeta = ingresosViajes - gastosTotales;

        return {
            vehiculo,
            periodo: { desde: fechaDesde, hasta: fechaHasta },
            ingresosViajes,
            gastosViaticos,
            pagosChoferes,
            gastosMantenimientos,
            gastosTotales,
            gananciaNeta,
            viajesCompletados: viajes.length
        };
    },

    // 2. Reporte por Chofer
    async reportePorChofer(choferId: number, fechaDesde: Date, fechaHasta: Date) {
        const chofer = await prisma.chofer.findUnique({ where: { id: choferId } });
        if (!chofer) throw new Error('Chofer no encontrado');

        // Viajes completados
        const viajes = await prisma.viaje.findMany({
            where: {
                choferId,
                estado: 'COMPLETADO',
                fechaLlegadaReal: { gte: fechaDesde, lte: fechaHasta }
            },
            select: {
                id: true,
                tarifa: true,
                montoPagoChofer: true
            }
        });

        const countViajes = viajes.length;

        // Calcular ingresos generados según modalidad de pago
        let ingresosGenerados = 0;
        if (chofer.modalidadPago === 'POR_VIAJE') {
            // Para POR_VIAJE: suma de montos de pago de viajes completados
            ingresosGenerados = viajes.reduce((acc, v) => acc + Number(v.montoPagoChofer || 0), 0);
        } else {
            // Para MENSUAL: no se calcula basado en viajes
            ingresosGenerados = 0;
        }

        const pagosRealizados = await pagosChoferRepository.sumarPagos(choferId, fechaDesde, fechaHasta);

        return {
            chofer,
            periodo: { desde: fechaDesde, hasta: fechaHasta },
            viajesRealizados: countViajes,
            ingresosGenerados,
            pagosRealizados,
            saldoPendiente: ingresosGenerados - pagosRealizados
        };
    },

    // 3. Reporte por Cliente
    async reportePorCliente(clienteId: number, fechaDesde: Date, fechaHasta: Date) {
        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
        if (!cliente) throw new Error('Cliente no encontrado');

        const viajes = await prisma.viaje.findMany({
            where: {
                clienteId,
                estado: 'COMPLETADO',
                estadoPagoCliente: 'PAGADO', // FIX: Solo contar ingresos reales
                fechaLlegadaReal: { gte: fechaDesde, lte: fechaHasta }
            },
            include: { material: true }
        });

        const ingresosTotales = viajes.reduce((acc, v) => acc + Number(v.tarifa), 0);

        // Find most frequent material
        const materialCounts: Record<string, number> = {};
        for (const v of viajes) {
            const matName = v.material.nombre;
            materialCounts[matName] = (materialCounts[matName] || 0) + 1;
        }

        let materialMasFrecuente = '';
        let maxCount = 0;
        for (const [name, count] of Object.entries(materialCounts)) {
            if (count > maxCount) {
                maxCount = count;
                materialMasFrecuente = name;
            }
        }

        return {
            cliente,
            periodo: { desde: fechaDesde, hasta: fechaHasta },
            viajesRealizados: viajes.length,
            ingresosTotales,
            materialMasFrecuente
        };
    },


    // 4. Reporte Mensual Comparativo
    async reporteMensualComparativo(anio: number, meses?: number[]) {
        const mesesConsulta = meses && meses.length > 0
            ? meses
            : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        const resultados = [];

        for (const mes of mesesConsulta) {
            const fechaInicio = new Date(anio, mes - 1, 1);
            const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

            // Ingresos
            const viajesCompletados = await prisma.viaje.findMany({
                where: {
                    estado: 'COMPLETADO',
                    estadoPagoCliente: 'PAGADO', // FIX: Solo contar dinero recibido
                    fechaLlegadaReal: { gte: fechaInicio, lte: fechaFin }
                },
                select: { id: true, tarifa: true, montoPagoChofer: true }
            });

            const ingresos = viajesCompletados.reduce((acc, v) => acc + Number(v.tarifa), 0);

            // Gastos
            let gastosViaticos = 0;
            for (const v of viajesCompletados) {
                gastosViaticos += await gastosRepository.sumarGastosViaje(v.id);
            }

            const pagosChoferesViajes = viajesCompletados.reduce((acc, v) => acc + Number(v.montoPagoChofer || 0), 0);
            const pagosChoferesDirectos = await pagosChoferRepository.sumarPagos(undefined, fechaInicio, fechaFin);
            const gastosChoferes = pagosChoferesViajes + pagosChoferesDirectos;

            const gastosMantenimientos = await mantenimientosRepository.sumarCostos(undefined, fechaInicio, fechaFin);

            const totalGastos = gastosViaticos + gastosChoferes + gastosMantenimientos;

            resultados.push({
                mes,
                anio,
                ingresos,
                gastos: totalGastos,
                ganancia: ingresos - totalGastos,
                detalles: {
                    viaticos: gastosViaticos,
                    choferes: gastosChoferes,
                    mantenimientos: gastosMantenimientos
                }
            });
        }

        return resultados;
    },

    // 5. Reporte de Cartera (Cuentas por Cobrar)
    async reporteCartera() {
        // Obtener todos los viajes pendientes de pago
        const viajesPendientes = await prisma.viaje.findMany({
            where: {
                estadoPagoCliente: { in: ['PENDIENTE', 'PARCIAL'] },
                estado: { not: 'CANCELADO' }
            },
            include: {
                cliente: true
            }
        });

        // Agrupar por Cliente
        const carteraPorCliente: Record<number, any> = {};
        const hoy = new Date();
        // Resetear horas para comparación de días
        hoy.setHours(0, 0, 0, 0);

        for (const viaje of viajesPendientes) {
            const clienteId = viaje.clienteId;

            if (!carteraPorCliente[clienteId]) {
                carteraPorCliente[clienteId] = {
                    cliente: viaje.cliente,
                    totalDeuda: 0,
                    porVencer: 0,
                    vencido1_30: 0,
                    vencido31_60: 0,
                    vencido61_90: 0,
                    vencido90Mas: 0,
                    viajesCount: 0
                };
            }

            const tarifa = Number(viaje.tarifa);
            const pagado = Number(viaje.montoPagadoCliente || 0);
            const deuda = tarifa - pagado;

            // Acumular deuda total
            carteraPorCliente[clienteId].totalDeuda += deuda;
            carteraPorCliente[clienteId].viajesCount++;

            // Calcular días de vencimiento
            // Si no tiene fecha límite, usamos fecha de salida como referencia (contado)
            const fechaVencimiento = viaje.fechaLimitePago ? new Date(viaje.fechaLimitePago) : new Date(viaje.fechaSalida);
            fechaVencimiento.setHours(0, 0, 0, 0);

            // Diferencia en días: Hoy - Vencimiento
            // Si (Hoy - Vencimiento) > 0, está vencido.
            // Si (Hoy - Vencimiento) <= 0, está vigente (por vencer).
            const diffTime = hoy.getTime() - fechaVencimiento.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                carteraPorCliente[clienteId].porVencer += deuda;
            } else if (diffDays <= 30) {
                carteraPorCliente[clienteId].vencido1_30 += deuda;
            } else if (diffDays <= 60) {
                carteraPorCliente[clienteId].vencido31_60 += deuda;
            } else if (diffDays <= 90) {
                carteraPorCliente[clienteId].vencido61_90 += deuda;
            } else {
                carteraPorCliente[clienteId].vencido90Mas += deuda;
            }
        }

        return Object.values(carteraPorCliente).sort((a: any, b: any) => b.totalDeuda - a.totalDeuda);
    },

    // FIX #3: Reporte General (Financiero) - BASE DEVENGADA (Accrual Basis)
    //  Muestra ingresos GANADOS y gastos INCURRIDOS, independiente de si se cobró/pagó
    async reporteGeneral(fechaDesde: Date, fechaHasta: Date) {
        // 1. Obtener TODOS los viajes COMPLETADOS en el periodo
        const viajesCompletados = await prisma.viaje.findMany({
            where: {
                estado: 'COMPLETADO',
                estadoPagoCliente: 'PAGADO', // FIX: Usuario solicita solo contar plata cuando está pagado
                fechaLlegadaReal: { gte: fechaDesde, lte: fechaHasta }
            },
            include: {
                pagos: true, // Pagos realizados al chofer por este viaje
                gastos: true // Gastos/Viáticos del viaje
            }
        });

        let ingresos = 0;
        let viaticos = 0;
        let pagosChoferes = 0;

        // 2. Calcular ingresos DEVENGADOS (todo viaje completado = ingreso ganado)
        for (const viaje of viajesCompletados) {
            // INGRESO: Lo que se ganó (independiente de si el cliente pagó)
            ingresos += Number(viaje.tarifa);

            // GASTOS: Viáticos del viaje
            viaticos += viaje.gastos.reduce((acc, g) => acc + Number(g.monto), 0);

            // GASTOS: Pagos REALES al chofer (solo lo que ya se pagó)
            const totalPagadoChofer = viaje.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
            pagosChoferes += totalPagadoChofer;
        }

        // 3. Mantenimientos (Siguen siendo globales del periodo)
        const mantenimientos = await mantenimientosRepository.sumarCostos(undefined, fechaDesde, fechaHasta);

        const gastosTotales = viaticos + mantenimientos + pagosChoferes;
        const gananciaNeta = ingresos - gastosTotales;

        return {
            periodo: { desde: fechaDesde, hasta: fechaHasta },
            ingresos,
            gastos: {
                viaticos,
                mantenimientos,
                pagosChoferes,
                total: gastosTotales
            },
            gananciaNeta
        };
    }
};
