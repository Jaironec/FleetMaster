// Rutas de Mantenimientos
import { Router } from 'express';
import { mantenimientoController } from '../controllers/mantenimiento.controller';
import { verificarToken, puedeLeer, puedeEscribir } from '../middlewares/auth.middleware';
import upload from '../config/multer.config';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/mantenimientos - Listar
router.get('/', puedeLeer, mantenimientoController.listar);

// GET /api/mantenimientos/:id - Detalle
router.get('/:id', puedeLeer, mantenimientoController.obtenerDetalle);

// POST /api/mantenimientos - Crear (con archivo opcional)
router.post('/', puedeEscribir, upload.single('archivo'), mantenimientoController.crear);

// POST /api/mantenimientos/:id/iniciar - Iniciar mantenimiento PENDIENTE
router.post('/:id/iniciar', puedeEscribir, mantenimientoController.iniciar);

// POST /api/mantenimientos/:id/completar - Completar mantenimiento EN_CURSO
router.post('/:id/completar', puedeEscribir, upload.single('archivo'), mantenimientoController.completar);

// POST /api/mantenimientos/:id/cancelar - Cancelar mantenimiento PENDIENTE
router.post('/:id/cancelar', puedeEscribir, mantenimientoController.cancelar);

// DELETE /api/mantenimientos/:id - Eliminar
router.delete('/:id', puedeEscribir, mantenimientoController.eliminar);

export default router;

