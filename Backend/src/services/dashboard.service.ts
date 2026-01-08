// Servicio de Dashboard - Resumen del sistema
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { choferRepository } from '../repositories/chofer.repository';
import { clienteRepository } from '../repositories/cliente.repository';
import { materialRepository } from '../repositories/material.repository';
import { viajesRepository } from '../repositories/viajes.repository';
import { gastosRepository } from '../repositories/gastos.repository';
import { mantenimientosRepository } from '../repositories/mantenimiento.repository';
import { pagosChoferRepository } from '../repositories/pagosChofer.repository';
import { alertasService } from './alertas.service';
import prisma from '../config/database';

export const dashboardService = {
    async obtenerResumen() {
        // Obtener mes y año actual
        const ahora = new Date();
        const mesActual = ahora.getMonth() + 1;
        const anioActual = ahora.getFullYear();

        // Calcular rango de fechas del mes
        const fechaInicio = new Date(anioActual, mesActual - 1, 1);
        const fechaFin = new Date(anioActual, mesActual, 0, 23, 59, 59);

        const [
            vehiculosActivos,
            vehiculosTotal,
            choferesActivos,
            choferesTotal,
            clientesActivos,
            clientesTotal,
            materialesTotal,
            estadisticasViajes,
            topVehiculos,
            topClientes,
            alertas
        ] = await Promise.all([
            vehiculoRepository.countActivos(),
            vehiculoRepository.countTotal(),
            choferRepository.countActivos(),
            choferRepository.countTotal(),
            clienteRepository.countActivos(),
            clienteRepository.countTotal(),
            materialRepository.countTotal(),
            viajesRepository.getEstadisticasMensuales(anioActual, mesActual),
            this.obtenerTopVehiculos(fechaInicio, fechaFin),
            this.obtenerTopClientes(fechaInicio, fechaFin),
            alertasService.obtenerAlertas()
        ]);

        // Calcular gastos completos del mes
        // 1. Gastos viáticos (de viajes completados en el mes)
        const viajesCompletados = await prisma.viaje.findMany({
            where: {
                estado: 'COMPLETADO',
                fechaLlegadaReal: { gte: fechaInicio, lte: fechaFin }
            },
            select: { id: true, montoPagoChofer: true }
        });

        let gastosViaticos = 0;
        for (const viaje of viajesCompletados) {
            gastosViaticos += await gastosRepository.sumarGastosViaje(viaje.id);
        }

        // FIX #2: Pagos a choferes - Solo contar pagos REALMENTE REGISTRADOS en el periodo
        // ANTES: Sumaba montoPagoChofer (pactado) + pagos reales = DOBLE CONTEO
        // AHORA: Solo pagos efectivamente registrados
        const totalPagosChoferes = await pagosChoferRepository.sumarPagos(
            undefined,  // todos los choferes
            fechaInicio,
            fechaFin
        );

        // 3. Gastos de mantenimientos (del mes)
        const gastosMantenimientos = await mantenimientosRepository.sumarCostos(undefined, fechaInicio, fechaFin);

        // Gastos totales (Declaración restaurada)
        const gastosTotales = gastosViaticos + totalPagosChoferes + gastosMantenimientos;

        // FIX #8: Separar métricas financieras del Dashboard
        // 4a. Ingresos DEVENGADOS (todo viaje completado en el mes)
        const ingresosDevengados = await prisma.viaje.aggregate({
            where: {
                estado: 'COMPLETADO',
                fechaLlegadaReal: { gte: fechaInicio, lte: fechaFin }
            },
            _sum: { tarifa: true }
        });
        const totalDevengado = Number(ingresosDevengados._sum.tarifa || 0);

        // 4b. Ingresos COBRADOS (efectivo recibido en el mes)
        // Sumar montoPagadoCliente de viajes completados en el mes que están PAGADOS
        const ingresosCobrados = await prisma.viaje.aggregate({
            where: {
                estado: 'COMPLETADO',
                fechaLlegadaReal: { gte: fechaInicio, lte: fechaFin },
                estadoPagoCliente: 'PAGADO'
            },
            _sum: { montoPagadoCliente: true }
        });
        const totalCobrado = Number(ingresosCobrados._sum.montoPagadoCliente || 0);

        // 4c. Por cobrar DEL MES (viajes del mes no pagados completamente)
        const porCobrarMes = totalDevengado - totalCobrado;

        // 4d. Cuentas por cobrar HISTÓRICA (todo lo pendiente, no solo del mes)
        const saldoPendienteHistorico = await prisma.viaje.aggregate({
            where: {
                estado: 'COMPLETADO',
                estadoPagoCliente: { not: 'PAGADO' }
            },
            _sum: { tarifa: true, montoPagadoCliente: true }
        });
        const totalPorCobrarHistorico =
            Number(saldoPendienteHistorico._sum.tarifa || 0) -
            Number(saldoPendienteHistorico._sum.montoPagadoCliente || 0);

        // Ganancia neta = Ingresos Cobrados - Todos los gastos (FLUJO DE CAJA)
        const gananciaNeta = totalCobrado - gastosTotales;

        // Margen de rentabilidad
        const margenRentabilidad = totalCobrado > 0
            ? ((gananciaNeta / totalCobrado) * 100)
            : 0;

        return {
            periodo: {
                desde: fechaInicio.toISOString(),
                hasta: fechaFin.toISOString(),
                mes: mesActual,
                anio: anioActual
            },
            vehiculos: { activos: vehiculosActivos, total: vehiculosTotal },
            choferes: { activos: choferesActivos, total: choferesTotal },
            clientes: { activos: clientesActivos, total: clientesTotal },
            materiales: { total: materialesTotal },
            viajesMes: {
                total: estadisticasViajes.totalViajes,
                completados: estadisticasViajes.viajesCompletados,
                // FIX #8: Nuevas métricas separadas
                ingresosDevengados: totalDevengado,      // Lo que SE GANÓ
                ingresosCobrados: totalCobrado,          // Lo que SE COBRÓ
                porCobrarDelMes: porCobrarMes,           // Pendiente del mes
                porCobrarHistorico: totalPorCobrarHistorico, // Deuda total acumulada
                gastosViaticos,
                pagosChoferes: totalPagosChoferes,
                gastosMantenimientos,
                gastosTotales,
                gananciaNeta,
                margenRentabilidad
            },
            topVehiculos,
            topClientes,
            resumenAlertas: alertas.resumen
        };
    },

    /**
     * Obtener Top 3 vehículos por viajes completados
     */
    async obtenerTopVehiculos(fechaInicio: Date, fechaFin: Date) {
        const resultado = await prisma.viaje.groupBy({
            by: ['vehiculoId'],
            where: {
                estado: 'COMPLETADO',
                fechaLlegadaReal: { gte: fechaInicio, lte: fechaFin }
            },
            _count: { id: true },
            _sum: { tarifa: true },
            orderBy: { _count: { id: 'desc' } },
            take: 3
        });

        // Obtener datos de los vehículos
        const vehiculosConDatos = await Promise.all(
            resultado.map(async (r) => {
                const vehiculo = await prisma.vehiculo.findUnique({
                    where: { id: r.vehiculoId },
                    select: { id: true, placa: true, marca: true, modelo: true }
                });
                return {
                    vehiculoId: r.vehiculoId,
                    placa: vehiculo?.placa || 'N/A',
                    marca: vehiculo?.marca || '',
                    modelo: vehiculo?.modelo || '',
                    cantidadViajes: r._count.id,
                    ingresosGenerados: Number(r._sum.tarifa || 0)
                };
            })
        );

        return vehiculosConDatos;
    },

    /**
     * Obtener Top 3 clientes por ingresos
     */
    async obtenerTopClientes(fechaInicio: Date, fechaFin: Date) {
        const resultado = await prisma.viaje.groupBy({
            by: ['clienteId'],
            where: {
                estado: 'COMPLETADO',
                fechaLlegadaReal: { gte: fechaInicio, lte: fechaFin }
            },
            _sum: { tarifa: true },
            _count: { id: true },
            orderBy: { _sum: { tarifa: 'desc' } },
            take: 3
        });

        // Obtener datos de los clientes
        const clientesConDatos = await Promise.all(
            resultado.map(async (r) => {
                const cliente = await prisma.cliente.findUnique({
                    where: { id: r.clienteId },
                    select: { id: true, nombreRazonSocial: true, documentoId: true }
                });
                return {
                    clienteId: r.clienteId,
                    nombre: cliente?.nombreRazonSocial || 'N/A',
                    ruc: cliente?.documentoId || '',
                    cantidadViajes: r._count.id,
                    ingresosGenerados: Number(r._sum.tarifa || 0)
                };
            })
        );

        return clientesConDatos;
    }
};
