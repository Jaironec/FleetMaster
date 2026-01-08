// Controlador de Mantenimientos
import { Request, Response, NextFunction } from 'express';
import { mantenimientoService } from '../services/mantenimiento.service';
import { TipoMantenimiento } from '@prisma/client';

export const mantenimientoController = {
    /**
     * GET /api/mantenimientos
     * Listar mantenimientos con filtros
     */
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const { vehiculoId, fechaDesde, fechaHasta, tipo, estado } = req.query;

            const filtros = {
                vehiculoId: vehiculoId ? Number(vehiculoId) : undefined,
                fechaDesde: fechaDesde ? new Date(fechaDesde as string) : undefined,
                fechaHasta: fechaHasta ? new Date(fechaHasta as string) : undefined,
                tipo: (tipo && tipo !== '') ? (tipo as TipoMantenimiento) : undefined,
                estado: estado as string | undefined,
            };

            const mantenimientos = await mantenimientoService.listar(filtros);

            res.json({
                exito: true,
                datos: mantenimientos,
            });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * GET /api/mantenimientos/:id
     */
    async obtenerDetalle(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const mantenimiento = await mantenimientoService.obtenerDetalle(Number(id));
            res.json({ exito: true, datos: mantenimiento });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * POST /api/mantenimientos
     * Registrar nuevo mantenimiento
     * - PREVENTIVO: Crea en estado PENDIENTE
     * - CORRECTIVO: Crea en estado EN_CURSO y pone vehículo EN_MANTENIMIENTO
     */
    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const {
                vehiculoId,
                tipo,
                descripcion,
                taller,
                costoManoObra,
                costoRepuestos,
                fecha,
                kilometrajeAlMomento,
                proximaFecha,
                proximoKilometraje
            } = req.body;

            // Validaciones - taller opcional para PREVENTIVO
            if (!vehiculoId || !tipo || !fecha) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'Faltan campos requeridos: vehiculoId, tipo, fecha'
                });
            }

            // Para CORRECTIVO, taller es obligatorio
            if (tipo === 'CORRECTIVO' && !taller) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'Para mantenimiento CORRECTIVO, el taller es obligatorio'
                });
            }

            const mantenimiento = await mantenimientoService.crear({
                vehiculoId: Number(vehiculoId),
                tipo: tipo as 'PREVENTIVO' | 'CORRECTIVO',
                descripcion,
                taller,
                costoManoObra: costoManoObra ? parseFloat(costoManoObra) : 0,
                costoRepuestos: costoRepuestos ? parseFloat(costoRepuestos) : 0,
                fecha: new Date(fecha),
                kilometrajeAlMomento: kilometrajeAlMomento ? Number(kilometrajeAlMomento) : undefined,
                proximaFecha: proximaFecha ? new Date(proximaFecha) : undefined,
                proximoKilometraje: proximoKilometraje ? Number(proximoKilometraje) : undefined,
                archivo: req.file ? {
                    buffer: req.file.buffer,
                    originalname: req.file.originalname
                } : undefined
            }, usuarioId);

            res.status(201).json({
                exito: true,
                mensaje: tipo === 'CORRECTIVO'
                    ? 'Mantenimiento iniciado - Vehículo en taller'
                    : 'Mantenimiento programado',
                datos: mantenimiento
            });

        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * POST /api/mantenimientos/:id/iniciar
     * Iniciar un mantenimiento PENDIENTE (llevarlo al taller)
     */
    async iniciar(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const { taller } = req.body;

            if (!taller) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'El nombre del taller es requerido'
                });
            }

            const mantenimiento = await mantenimientoService.iniciar(Number(id), taller, usuarioId);

            res.json({
                exito: true,
                mensaje: 'Mantenimiento iniciado - Vehículo en taller',
                datos: mantenimiento
            });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * POST /api/mantenimientos/:id/completar
     * Completar un mantenimiento EN_CURSO
     */
    async completar(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const {
                taller,
                costoManoObra,
                costoRepuestos,
                descripcion,
                kilometrajeAlMomento,
                proximoKilometraje
            } = req.body;

            if (!taller || costoManoObra === undefined || costoRepuestos === undefined) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'Campos requeridos: taller, costoManoObra, costoRepuestos'
                });
            }

            const mantenimiento = await mantenimientoService.completar(Number(id), {
                taller,
                costoManoObra: parseFloat(costoManoObra),
                costoRepuestos: parseFloat(costoRepuestos),
                descripcion,
                kilometrajeAlMomento: kilometrajeAlMomento ? Number(kilometrajeAlMomento) : undefined,
                proximoKilometraje: proximoKilometraje ? Number(proximoKilometraje) : undefined,
                archivo: req.file ? {
                    buffer: req.file.buffer,
                    originalname: req.file.originalname
                } : undefined
            }, usuarioId);

            res.json({
                exito: true,
                mensaje: 'Mantenimiento completado - Vehículo disponible',
                datos: mantenimiento
            });
        } catch (error: unknown) {
            next(error);
        }
    },

    /**
     * POST /api/mantenimientos/:id/cancelar
     * Cancelar un mantenimiento PENDIENTE
     */
    async cancelar(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const mantenimiento = await mantenimientoService.cancelar(Number(id), usuarioId);

            res.json({
                exito: true,
                mensaje: 'Mantenimiento cancelado',
                datos: mantenimiento
            });
        } catch (error: unknown) {
            next(error);
        }
    },

    async eliminar(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) return res.status(401).json({ exito: false, mensaje: 'No autorizado' });

            const { id } = req.params;
            const result = await mantenimientoService.eliminar(Number(id), usuarioId);

            res.json({ exito: true, mensaje: result.mensaje });
        } catch (error: unknown) {
            next(error);
        }
    }
};
