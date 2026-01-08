// Rutas de Clientes

import { Router } from 'express';
import {
    listarClientes,
    obtenerCliente,
    crearCliente,
    actualizarCliente,
    eliminarCliente
} from '../controllers/cliente.controller';
import { verificarToken, puedeLeer, puedeEscribir } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', puedeLeer, listarClientes);
router.get('/:id', puedeLeer, obtenerCliente);
router.post('/', puedeEscribir, crearCliente);
router.put('/:id', puedeEscribir, actualizarCliente);
router.delete('/:id', puedeEscribir, eliminarCliente);

export default router;
