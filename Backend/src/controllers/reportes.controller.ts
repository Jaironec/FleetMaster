// Controlador de Reportes
import { Request, Response, NextFunction } from 'express';
import { reportesService } from '../services/reportes.service';

export const reportesController = {
    async reportePorVehiculo(req: Request, res: Response, next: NextFunction) {
        try {
            const { vehiculoId, fechaDesde, fechaHasta } = req.query;
            if (!vehiculoId || !fechaDesde || !fechaHasta) {
                return res.status(400).json({ exito: false, mensaje: 'Faltan parámetros (vehiculoId, fechaDesde, fechaHasta)' });
            }

            const data = await reportesService.reportePorVehiculo(
                Number(vehiculoId),
                new Date(fechaDesde as string),
                new Date(fechaHasta as string)
            );
            res.json({ exito: true, datos: data });
        } catch (error: unknown) {
            next(error);
        }
    },

    async reportePorChofer(req: Request, res: Response, next: NextFunction) {
        try {
            const { choferId, fechaDesde, fechaHasta } = req.query;
            if (!choferId || !fechaDesde || !fechaHasta) {
                return res.status(400).json({ exito: false, mensaje: 'Faltan parámetros (choferId, fechaDesde, fechaHasta)' });
            }

            const data = await reportesService.reportePorChofer(
                Number(choferId),
                new Date(fechaDesde as string),
                new Date(fechaHasta as string)
            );
            res.json({ exito: true, datos: data });
        } catch (error: unknown) {
            next(error);
        }
    },

    async reportePorCliente(req: Request, res: Response, next: NextFunction) {
        try {
            const { clienteId, fechaDesde, fechaHasta } = req.query;
            if (!clienteId || !fechaDesde || !fechaHasta) {
                return res.status(400).json({ exito: false, mensaje: 'Faltan parámetros (clienteId, fechaDesde, fechaHasta)' });
            }

            const data = await reportesService.reportePorCliente(
                Number(clienteId),
                new Date(fechaDesde as string),
                new Date(fechaHasta as string)
            );
            res.json({ exito: true, datos: data });
        } catch (error: unknown) {
            next(error);
        }
    },

    // Exportación (Mock simple por ahora: devuelve JSON con headers para forzar descarga si se desea,
    // o el frontend convierte a CSV. El usuario dijo: "Backend toma los datos... convierte a CSV... setea headers".
    // Vamos a hacer una implementación simple de CSV aquí.)
    async exportarReporteVehiculo(req: Request, res: Response, next: NextFunction) {
        try {
            const { vehiculoId, fechaDesde, fechaHasta } = req.query;
            const data = await reportesService.reportePorVehiculo(
                Number(vehiculoId),
                new Date(fechaDesde as string),
                new Date(fechaHasta as string)
            );

            // Simple CSV construction
            const headers = ['Concepto', 'Valor'];
            const rows = [
                ['Vehículo', data.vehiculo?.placa || ''],
                ['Periodo Desde', fechaDesde],
                ['Periodo Hasta', fechaHasta],
                ['Ingresos Viajes', data.ingresosViajes],
                ['Gastos Viáticos', data.gastosViaticos],
                ['Pagos Choferes', data.pagosChoferes],
                ['Gastos Mantenimiento', data.gastosMantenimientos],
                ['Gastos Totales', data.gastosTotales],
                ['Ganancia Neta', data.gananciaNeta]
            ];

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_vehiculo_${vehiculoId}.csv`);
            res.status(200).send(csvContent);
        } catch (error: unknown) {
            next(error);
        }
    },

    async exportarReporteChofer(req: Request, res: Response, next: NextFunction) {
        try {
            const { choferId, fechaDesde, fechaHasta } = req.query;
            const data = await reportesService.reportePorChofer(
                Number(choferId),
                new Date(fechaDesde as string),
                new Date(fechaHasta as string)
            );

            const headers = ['Concepto', 'Valor'];
            const rows = [
                ['Chofer', `${data.chofer.nombres} ${data.chofer.apellidos}`],
                ['Periodo Desde', fechaDesde],
                ['Periodo Hasta', fechaHasta],
                ['Viajes Realizados', data.viajesRealizados],
                ['Ingresos Generados', data.ingresosGenerados],
                ['Pagos Realizados', data.pagosRealizados],
                ['Saldo Pendiente', data.saldoPendiente]
            ];

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_chofer_${choferId}.csv`);
            res.status(200).send(csvContent);
        } catch (error: unknown) {
            next(error);
        }
    },

    async exportarReporteCliente(req: Request, res: Response, next: NextFunction) {
        try {
            const { clienteId, fechaDesde, fechaHasta } = req.query;
            const data = await reportesService.reportePorCliente(
                Number(clienteId),
                new Date(fechaDesde as string),
                new Date(fechaHasta as string)
            );

            const headers = ['Concepto', 'Valor'];
            const rows = [
                ['Cliente', data.cliente.nombreRazonSocial],
                ['Periodo Desde', fechaDesde],
                ['Periodo Hasta', fechaHasta],
                ['Viajes Realizados', data.viajesRealizados],
                ['Ingresos Totales', data.ingresosTotales],
                ['Material Frecuente', data.materialMasFrecuente]
            ];

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_cliente_${clienteId}.csv`);
            res.status(200).send(csvContent);
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * GET /api/reportes/mensual-comparativo
     * Reporte mensual comparativo
     */
    async reporteMensualComparativo(req: Request, res: Response, next: NextFunction) {
        try {
            const anio = req.query.anio ? parseInt(req.query.anio as string) : new Date().getFullYear();
            const meses = req.query.meses ? (req.query.meses as string).split(',').map(m => parseInt(m)) : undefined;

            const reporte = await reportesService.reporteMensualComparativo(anio, meses);
            res.json({ exito: true, datos: reporte });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * GET /api/reportes/cartera
     * Reporte de cuentas por cobrar (cartera)
     */
    async reporteCartera(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await reportesService.reporteCartera();
            res.json({ exito: true, datos: data });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * GET /api/reportes/general
     * Reporte general de ingresos y gastos
     */
    async reporteGeneral(req: Request, res: Response, next: NextFunction) {
        try {
            const { fechaDesde, fechaHasta } = req.query;
            if (!fechaDesde || !fechaHasta) {
                return res.status(400).json({ exito: false, mensaje: 'Faltan parámetros (fechaDesde, fechaHasta)' });
            }

            const fDesde = new Date(fechaDesde as string);
            const fHasta = new Date(fechaHasta as string);
            fHasta.setHours(23, 59, 59, 999);

            const data = await reportesService.reporteGeneral(fDesde, fHasta);
            res.json({ exito: true, datos: data });
        } catch (error: unknown) {
            next(error);
        }
    },

    async exportarReporteGeneral(req: Request, res: Response, next: NextFunction) {
        try {
            const { fechaDesde, fechaHasta } = req.query;
            const fDesde = new Date(fechaDesde as string);
            const fHasta = new Date(fechaHasta as string);
            fHasta.setHours(23, 59, 59, 999);

            const data = await reportesService.reporteGeneral(fDesde, fHasta);

            const headers = ['Concepto', 'Valor'];
            const rows = [
                ['Reporte', 'Global de Flota'],
                ['Desde', fechaDesde],
                ['Hasta', fechaHasta],
                ['Ingresos Totales', data.ingresos],
                ['Gastos Operativos', data.gastos.total],
                [' - Mantenimientos', data.gastos.mantenimientos],
                [' - Pagos Choferes', data.gastos.pagosChoferes],
                [' - Viáticos', data.gastos.viaticos],
                ['Ganancia Neta', data.gananciaNeta]
            ];

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_general_${new Date().getTime()}.csv`);
            res.status(200).send(csvContent);
        } catch (error: unknown) {
            next(error);
        }
    }
};
