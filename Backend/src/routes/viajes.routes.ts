// Rutas de Viajes
import { Router } from 'express';
import { viajesController } from '../controllers/viajes.controller';
import { gastosController } from '../controllers/gastos.controller';
import { verificarToken, puedeLeer, puedeEscribir } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { createViajeSchema, updateViajeSchema, cambiarEstadoViajeSchema } from '../schemas/viajes.schema';
import { upload } from '../config/multer.config';
import { writeLimiter, uploadLimiter } from '../config/rateLimiter.config';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ====================
// RUTAS DE VIAJES
// ====================

// GET /api/viajes - Listar viajes con filtros
router.get('/', puedeLeer, viajesController.listar);

// GET /api/viajes/:id - Detalle de viaje con gastos y rentabilidad
router.get('/:id', puedeLeer, viajesController.obtenerDetalle);

// POST /api/viajes - Crear viaje (solo admin)
router.post('/', writeLimiter, puedeEscribir, validateRequest(createViajeSchema), viajesController.crear);

// PUT /api/viajes/:id - Actualizar viaje (solo admin)
router.put('/:id', writeLimiter, puedeEscribir, validateRequest(updateViajeSchema), viajesController.actualizar);

// PATCH /api/viajes/:id/estado - Cambiar estado (solo admin)
router.patch('/:id/estado', writeLimiter, puedeEscribir, validateRequest(cambiarEstadoViajeSchema), viajesController.cambiarEstado);

// POST /api/viajes/:id/pago - Registrar pago del cliente (solo admin)
router.post('/:id/pago', writeLimiter, puedeEscribir, viajesController.registrarPago);

// DELETE /api/viajes/:id - Eliminar viaje (solo admin)
router.delete('/:id', writeLimiter, puedeEscribir, viajesController.eliminar);

// ====================
// RUTAS DE GASTOS DE VIAJE
// ====================

// GET /api/viajes/:viajeId/gastos - Listar gastos de un viaje
router.get('/:viajeId/gastos', puedeLeer, gastosController.listar);

// POST /api/viajes/:viajeId/gastos - Crear gasto (solo admin, con archivo opcional)
router.post(
    '/:viajeId/gastos',
    uploadLimiter,
    puedeEscribir,
    upload.single('comprobante'),
    gastosController.crear
);

export default router;
