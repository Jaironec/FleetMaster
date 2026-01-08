import { z } from 'zod';

export const createViajeSchema = z.object({
    body: z.object({
        vehiculoId: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),
        choferId: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),
        clienteId: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),
        materialId: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),

        origen: z.string().min(3, 'El origen debe tener al menos 3 caracteres'),
        destino: z.string().min(3, 'El destino debe tener al menos 3 caracteres'),

        // FIX #14: Validar fechaSalida no muy en el pasado
        fechaSalida: z.string()
            .transform(str => new Date(str))
            .refine((fecha) => {
                const hace30Dias = new Date();
                hace30Dias.setDate(hace30Dias.getDate() - 30);
                return fecha >= hace30Dias;
            }, {
                message: 'La fecha de salida no puede ser mayor a 30 días en el pasado'
            }),

        tarifa: z.union([z.number().positive(), z.string().transform(val => parseFloat(val))]),

        // Opcionales
        fechaLlegadaEstimada: z.string().optional()
            .transform(str => str ? new Date(str) : undefined),

        kilometrosEstimados: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).optional(),

        montoPagoChofer: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),

        observaciones: z.string().optional(),

        // FIX #9: Validar días de crédito con valores estándar
        diasCredito: z.union([z.number(), z.string().transform(val => parseInt(val, 10))])
            .optional()
            .default(0)
            .refine((val) => [0, 15, 30, 60, 90].includes(val), {
                message: 'Los días de crédito deben ser 0, 15, 30, 60 o 90 días'
            })
    })
});

export const updateViajeSchema = z.object({
    params: z.object({
        id: z.string().transform(val => parseInt(val, 10))
    }),
    body: z.object({
        vehiculoId: z.number().optional(),
        choferId: z.number().optional(),
        clienteId: z.number().optional(),
        origen: z.string().optional(),
        destino: z.string().optional(),
        fechaSalida: z.string().optional().transform(str => str ? new Date(str) : undefined),
        tarifa: z.number().optional(),
        montoPagoChofer: z.number().optional(),
    }).partial()
});

export const cambiarEstadoViajeSchema = z.object({
    params: z.object({
        id: z.string().transform(val => parseInt(val, 10))
    }),
    body: z.object({
        estado: z.enum(['PLANIFICADO', 'EN_CURSO', 'COMPLETADO', 'CANCELADO']),
        fechaLlegadaReal: z.string().optional().transform(str => str ? new Date(str) : undefined),
        kilometrosReales: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).optional()
    })
});
