import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';
import logger, { logError } from '../config/logger.config';

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // 1. Log del error con logging estructurado
    logError(err, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });

    // 2. Errores de Zod (Validación)
    if (err instanceof ZodError) {
        return res.status(400).json({
            exito: false,
            mensaje: 'Error de validación',
            errores: err.issues.map((e: any) => ({
                campo: e.path.join('.'),
                mensaje: e.message
            }))
        });
    }

    // 3. Errores Operacionales Conocidos (AppError)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            exito: false,
            mensaje: err.message
        });
    }

    // 4. Errores de Prisma (Base de Datos)
    // P2002: Unique constraint failed
    if ((err as any).code === 'P2002') {
        const target = (err as any).meta?.target;
        return res.status(409).json({
            exito: false,
            mensaje: `El valor ingresado ya existe en el sistema${target ? `: ${target}` : ''}`
        });
    }
    // P2025: Record not found
    if ((err as any).code === 'P2025') {
        return res.status(404).json({
            exito: false,
            mensaje: 'Registro no encontrado en la base de datos'
        });
    }

    // 5. Error Genérico (Server Error)
    // En producción no deberíamos mostrar el stack trace
    return res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
