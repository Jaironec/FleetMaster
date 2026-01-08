// Controlador de Clientes - Usa Service con validación Zod
import { Request, Response, NextFunction } from 'express';
import { clienteService, clienteSchema } from '../services/cliente.service';
import { EstadoCliente } from '@prisma/client';

// GET /api/clientes
export const listarClientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { busqueda, estado } = req.query;
        const clientes = await clienteService.listar({
            busqueda: busqueda as string,
            estado: estado as EstadoCliente
        });
        res.json({ exito: true, datos: clientes });
    } catch (error: unknown) {
        next(error);
    }
};

// GET /api/clientes/:id
export const obtenerCliente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const cliente = await clienteService.obtenerPorId(parseInt(req.params.id));
        if (!cliente) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
        res.json({ cliente });
    } catch (error: unknown) {
        next(error);
    }
};

// POST /api/clientes
export const crearCliente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = clienteSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const cliente = await clienteService.crear(resultado.data, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Cliente creado: ${cliente.nombreRazonSocial}`);
        res.status(201).json({ mensaje: 'Cliente creado exitosamente', cliente });
    } catch (error: unknown) {
        next(error);
    }
};

// PUT /api/clientes/:id
export const actualizarCliente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const cliente = await clienteService.actualizar(parseInt(req.params.id), req.body, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Cliente actualizado: ${cliente.nombreRazonSocial}`);
        res.json({ mensaje: 'Cliente actualizado exitosamente', cliente });
    } catch (error: unknown) {
        next(error);
    }
};

// DELETE /api/clientes/:id
export const eliminarCliente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const cliente = await clienteService.eliminar(parseInt(req.params.id), req.usuario!.id, req.ip || undefined);
        console.log(`🗑️ Cliente eliminado: ${cliente.nombreRazonSocial}`);
        res.json({ mensaje: 'Cliente eliminado exitosamente', clienteEliminado: cliente });
    } catch (error: unknown) {
        next(error);
    }
};
