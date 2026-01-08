// Controlador de Materiales - Usa Service con validación Zod
import { Request, Response, NextFunction } from 'express';
import { materialService, materialSchema } from '../services/material.service';

// GET /api/materiales
export const listarMateriales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { busqueda } = req.query;
        const materiales = await materialService.listar({ busqueda: busqueda as string });
        res.json({ total: materiales.length, materiales });
    } catch (error: unknown) {
        next(error);
    }
};

// GET /api/materiales/:id
export const obtenerMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const material = await materialService.obtenerPorId(parseInt(req.params.id));
        if (!material) { res.status(404).json({ error: 'Material no encontrado' }); return; }
        res.json({ material });
    } catch (error: unknown) {
        next(error);
    }
};

// POST /api/materiales
export const crearMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = materialSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const material = await materialService.crear(resultado.data, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Material creado: ${material.nombre}`);
        res.status(201).json({ mensaje: 'Material creado exitosamente', material });
    } catch (error: unknown) {
        next(error);
    }
};

// PUT /api/materiales/:id
export const actualizarMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const material = await materialService.actualizar(parseInt(req.params.id), req.body, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Material actualizado: ${material.nombre}`);
        res.json({ mensaje: 'Material actualizado exitosamente', material });
    } catch (error: unknown) {
        next(error);
    }
};

// DELETE /api/materiales/:id
export const eliminarMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const material = await materialService.eliminar(parseInt(req.params.id), req.usuario!.id, req.ip || undefined);
        console.log(`🗑️ Material eliminado: ${material.nombre}`);
        res.json({ mensaje: 'Material eliminado exitosamente', materialEliminado: material });
    } catch (error: unknown) {
        next(error);
    }
};
