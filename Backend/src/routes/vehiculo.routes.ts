// Rutas de Vehículos

import { Router } from 'express';
import {
    listarVehiculos,
    obtenerVehiculo,
    crearVehiculo,
    actualizarVehiculo,
    eliminarVehiculo
} from '../controllers/vehiculo.controller';
import { verificarToken, puedeLeer, puedeEscribir } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/vehiculos - Listar (Admin y Auditor pueden ver)
router.get('/', puedeLeer, listarVehiculos);

// GET /api/vehiculos/:id - Detalle (Admin y Auditor pueden ver)
router.get('/:id', puedeLeer, obtenerVehiculo);

// POST /api/vehiculos - Crear (Solo Admin)
router.post('/', puedeEscribir, crearVehiculo);

// PUT /api/vehiculos/:id - Actualizar (Solo Admin)
router.put('/:id', puedeEscribir, actualizarVehiculo);

// DELETE /api/vehiculos/:id - Eliminar (Solo Admin)
router.delete('/:id', puedeEscribir, eliminarVehiculo);

export default router;
