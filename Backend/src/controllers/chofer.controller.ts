// Controlador de Choferes - Usa Service con validación Zod
import { Request, Response, NextFunction } from 'express';
import { choferService, choferSchema } from '../services/chofer.service';
import { EstadoChofer } from '@prisma/client';

// GET /api/choferes
export const listarChoferes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { busqueda, estado } = req.query;
        const choferes = await choferService.listar({
            busqueda: busqueda as string,
            estado: estado as EstadoChofer
        });
        res.json({ exito: true, datos: choferes });
    } catch (error: unknown) {
        next(error);
    }
};

// GET /api/choferes/:id
export const obtenerChofer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const chofer = await choferService.obtenerPorId(parseInt(req.params.id));
        if (!chofer) { res.status(404).json({ error: 'Chofer no encontrado' }); return; }
        res.json({ chofer });
    } catch (error: unknown) {
        next(error);
    }
};

// POST /api/choferes
export const crearChofer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = choferSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const chofer = await choferService.crear(resultado.data, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Chofer creado: ${chofer.nombres} ${chofer.apellidos}`);
        res.status(201).json({ mensaje: 'Chofer creado exitosamente', chofer });
    } catch (error: unknown) {
        next(error);
    }
};

// PUT /api/choferes/:id
export const actualizarChofer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const chofer = await choferService.actualizar(parseInt(req.params.id), req.body, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Chofer actualizado: ${chofer.nombres} ${chofer.apellidos}`);
        res.json({ mensaje: 'Chofer actualizado exitosamente', chofer });
    } catch (error: unknown) {
        next(error);
    }
};

// DELETE /api/choferes/:id
export const eliminarChofer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const chofer = await choferService.eliminar(parseInt(req.params.id), req.usuario!.id, req.ip || undefined);
        console.log(`🗑️ Chofer eliminado: ${chofer.nombres} ${chofer.apellidos}`);
        res.json({ mensaje: 'Chofer eliminado exitosamente', choferEliminado: chofer });
    } catch (error: unknown) {
        next(error);
    }
};

// GET /api/choferes/:id/viajes-pendientes
export const obtenerViajesPendientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const viajes = await choferService.obtenerViajesPendientes(Number(req.params.id));
        res.json({ exito: true, viajes });
    } catch (error: unknown) {
        next(error);
    }
};
