// Controlador de Auditoría - Usa Service
import { Request, Response, NextFunction } from 'express';
import { auditoriaService } from '../services/auditoria.service';
import { AccionAuditoria } from '@prisma/client';

// GET /api/auditoria
export const listarAuditoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            entidad,
            accion,
            usuarioId,
            desde,
            hasta,
            page,
            limit
        } = req.query;

        const filtros: Record<string, unknown> = {};

        if (entidad) filtros.entidad = entidad as string;
        if (accion) filtros.accion = accion as AccionAuditoria;
        if (usuarioId) filtros.usuarioId = parseInt(usuarioId as string);
        if (desde) filtros.fechaInicio = new Date(desde as string);
        if (hasta) filtros.fechaFin = new Date(hasta as string);
        if (page) filtros.page = parseInt(page as string);
        if (limit) filtros.limit = parseInt(limit as string);

        const resultado = await auditoriaService.listar(filtros);

        // Mapear respuesta del repositorio (items/pagination) al formato estándar de API (datos/paginacion)
        res.json({
            exito: true,
            datos: resultado.items,
            paginacion: {
                total: resultado.pagination.total,
                pagina: resultado.pagination.page,
                limite: resultado.pagination.limit,
                totalPaginas: resultado.pagination.totalPages
            }
        });
    } catch (error: unknown) {
        next(error);
    }
};

// GET /api/auditoria/entidades
export const obtenerEntidades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const entidades = await auditoriaService.getEntidadesUnicas();
        res.json({ entidades });
    } catch (error: unknown) {
        next(error);
    }
};

// GET /api/auditoria/:id
export const obtenerRegistroAuditoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const registro = await auditoriaService.obtenerDetalle(id);
        res.json({ exito: true, datos: { registro } });
    } catch (error: unknown) {
        next(error);
    }
};
