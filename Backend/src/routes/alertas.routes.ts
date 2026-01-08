// Rutas de Alertas
import { Router } from 'express';
import { obtenerAlertas } from '../controllers/alertas.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// Ambos roles pueden ver las alertas
router.use(verificarToken);

router.get('/', obtenerAlertas);

export default router;
