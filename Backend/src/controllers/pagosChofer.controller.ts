// Controlador de Pagos a Choferes
import { Request, Response, NextFunction } from 'express';
import { pagoChoferService } from '../services/pagosChofer.service';
import { MetodoPago } from '@prisma/client';

export const pagosChoferController = {
    /**
     * GET /api/pagos-choferes
     */
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const { choferId, fechaDesde, fechaHasta, estado } = req.query;
            const filtros = {
                choferId: choferId ? Number(choferId) : undefined,
                fechaDesde: fechaDesde ? new Date(fechaDesde as string) : undefined,
                fechaHasta: fechaHasta ? new Date(fechaHasta as string) : undefined,
                estado: estado as 'PENDIENTE' | 'PAGADO' | undefined,
            };

            const pagos = await pagoChoferService.listar(filtros);
            res.json({ exito: true, datos: pagos });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * POST /api/pagos-choferes
     */
    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) return res.status(401).json({ exito: false, mensaje: 'No autorizado' });

            const { choferId, monto, fecha, metodoPago, descripcion, viajeId, banco, numeroCuenta } = req.body;

            if (!choferId || !monto || !fecha) {
                return res.status(400).json({ exito: false, mensaje: 'Faltan campos (choferId, monto, fecha)' });
            }

            const pago = await pagoChoferService.crear({
                choferId: Number(choferId),
                monto: parseFloat(monto),
                fecha: new Date(fecha),
                metodoPago: metodoPago as MetodoPago,
                descripcion,
                archivo: req.file ? {
                    buffer: req.file.buffer,
                    originalname: req.file.originalname
                } : undefined,
                viajeId: viajeId ? Number(viajeId) : undefined,
                datosBancarios: (banco && numeroCuenta) ? { banco, numeroCuenta } : undefined
            }, usuarioId);

            res.status(201).json({ exito: true, mensaje: 'Pago registrado', datos: pago });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * GET /api/pagos-choferes/resumen/:choferId
     */
    async obtenerResumen(req: Request, res: Response, next: NextFunction) {
        try {
            const { choferId } = req.params;
            const { fechaDesde, fechaHasta } = req.query;

            const resumen = await pagoChoferService.obtenerResumenEconomico(
                Number(choferId),
                fechaDesde ? new Date(fechaDesde as string) : undefined,
                fechaHasta ? new Date(fechaHasta as string) : undefined
            );

            res.json({ exito: true, datos: resumen });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * PATCH /api/pagos-choferes/:id/pagar
     * Marcar un pago como pagado
     */
    async marcarPagado(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) return res.status(401).json({ exito: false, mensaje: 'No autorizado' });

            const { id } = req.params;
            const { monto, fecha, metodoPago, descripcion } = req.body;

            // DEBUG: Ver si llega el archivo
            console.log('[DEBUG marcarPagado] req.file:', req.file ? { name: req.file.originalname, size: req.file.size } : 'NO FILE');
            console.log('[DEBUG marcarPagado] req.body:', { monto, fecha, metodoPago });


            // Procesar archivo si existe
            let archivoData;
            if (req.file) {
                archivoData = {
                    buffer: req.file.buffer,
                    originalname: req.file.originalname
                };
            }

            const pago = await pagoChoferService.marcarPagado(Number(id), usuarioId, {
                monto: monto ? parseFloat(monto) : undefined, // Puede ser parcial
                fecha: fecha ? new Date(fecha) : undefined,
                metodoPago: metodoPago,
                descripcion: descripcion,
                archivo: archivoData
            });

            res.json({
                exito: true,
                mensaje: 'Pago registrado exitosamente',
                datos: pago
            });
        } catch (error: unknown) {
            next(error);
        }
    }
};
