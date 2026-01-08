// Rutas de Choferes

import { Router } from 'express';
import {
    listarChoferes,
    obtenerChofer,
    crearChofer,
    actualizarChofer,
    eliminarChofer,
    obtenerViajesPendientes
} from '../controllers/chofer.controller';
import { verificarToken, puedeLeer, puedeEscribir } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', puedeLeer, listarChoferes);
router.get('/:id', puedeLeer, obtenerChofer);
router.post('/', puedeEscribir, crearChofer);
router.put('/:id', puedeEscribir, actualizarChofer);
router.delete('/:id', puedeEscribir, eliminarChofer);
router.get('/:id/viajes-pendientes', puedeLeer, obtenerViajesPendientes);

export default router;
