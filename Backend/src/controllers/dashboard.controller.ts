// Controlador de Dashboard - Usa Service
import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

// GET /api/dashboard
export const obtenerResumen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resumen = await dashboardService.obtenerResumen();
        res.json({ resumen });
    } catch (error: unknown) {
        next(error);
    }
};
