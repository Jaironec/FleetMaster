// Controlador de Vehículos - Usa Service con validación Zod
import { Request, Response, NextFunction } from 'express';
import { vehiculoService, vehiculoSchema } from '../services/vehiculo.service';
import { EstadoVehiculo } from '@prisma/client';

// GET /api/vehiculos
export const listarVehiculos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { busqueda, estado } = req.query;
        const vehiculos = await vehiculoService.listar({
            busqueda: busqueda as string,
            estado: estado as EstadoVehiculo
        });
        res.json({ exito: true, datos: vehiculos });
    } catch (error: unknown) {
        next(error);
    }
};

// GET /api/vehiculos/:id
export const obtenerVehiculo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const vehiculo = await vehiculoService.obtenerPorId(parseInt(req.params.id));
        if (!vehiculo) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
        res.json({ vehiculo });
    } catch (error: unknown) {
        next(error);
    }
};

// POST /api/vehiculos
export const crearVehiculo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Validar con Zod
        const resultado = vehiculoSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const vehiculo = await vehiculoService.crear(
            resultado.data,
            req.usuario!.id,
            req.ip || undefined
        );

        console.log(`✅ Vehículo creado: ${vehiculo.placa}`);
        res.status(201).json({ mensaje: 'Vehículo creado exitosamente', vehiculo });
    } catch (error: unknown) {
        next(error);
    }
};

// PUT /api/vehiculos/:id
export const actualizarVehiculo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const vehiculo = await vehiculoService.actualizar(
            parseInt(req.params.id),
            req.body,
            req.usuario!.id,
            req.ip || undefined
        );

        console.log(`✅ Vehículo actualizado: ${vehiculo.placa}`);
        res.json({ mensaje: 'Vehículo actualizado exitosamente', vehiculo });
    } catch (error: unknown) {
        next(error);
    }
};

// DELETE /api/vehiculos/:id
export const eliminarVehiculo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const vehiculo = await vehiculoService.eliminar(
            parseInt(req.params.id),
            req.usuario!.id,
            req.ip || undefined
        );

        console.log(`🗑️ Vehículo eliminado: ${vehiculo.placa}`);
        res.json({ mensaje: 'Vehículo eliminado exitosamente', vehiculoEliminado: vehiculo });
    } catch (error: unknown) {
        next(error);
    }
};
