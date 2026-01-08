// Rutas de Materiales

import { Router } from 'express';
import {
    listarMateriales,
    obtenerMaterial,
    crearMaterial,
    actualizarMaterial,
    eliminarMaterial
} from '../controllers/material.controller';
import { verificarToken, puedeLeer, puedeEscribir } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', puedeLeer, listarMateriales);
router.get('/:id', puedeLeer, obtenerMaterial);
router.post('/', puedeEscribir, crearMaterial);
router.put('/:id', puedeEscribir, actualizarMaterial);
router.delete('/:id', puedeEscribir, eliminarMaterial);

export default router;
