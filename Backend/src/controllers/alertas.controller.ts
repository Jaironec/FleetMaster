// Controller de Alertas
import { Request, Response, NextFunction } from 'express';
import { alertasService } from '../services/alertas.service';

export const obtenerAlertas = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const alertas = await alertasService.obtenerAlertas();
        res.json({ datos: alertas });
    } catch (error: unknown) {
        next(error);
    }
};
