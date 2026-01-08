// Rutas de Pagos a Choferes
import { Router } from 'express';
import { pagosChoferController } from '../controllers/pagosChofer.controller';
import { verificarToken, puedeLeer, puedeEscribir } from '../middlewares/auth.middleware';
import upload from '../config/multer.config';

const router = Router();

router.use(verificarToken);

// GET /api/pagos-choferes - Listar
router.get('/', puedeLeer, pagosChoferController.listar);

// GET /api/pagos-choferes/resumen/:choferId - Resumen económico
router.get('/resumen/:choferId', puedeLeer, pagosChoferController.obtenerResumen);

// POST /api/pagos-choferes - Crear
router.post('/', puedeEscribir, upload.single('archivo'), pagosChoferController.crear);

// PATCH /api/pagos-choferes/:id/pagar - Marcar como pagado
router.patch('/:id/pagar', puedeEscribir, upload.single('archivo'), pagosChoferController.marcarPagado);

export default router;
