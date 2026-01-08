// Rutas de Auditoría - EXCLUSIVAS PARA AUDITOR

import { Router } from 'express';
import { listarAuditoria, obtenerRegistroAuditoria, obtenerEntidades } from '../controllers/auditoria.controller';
import { verificarToken, soloAuditor } from '../middlewares/auth.middleware';

const router = Router();

// Solo AUDITOR puede acceder a estos registros
router.use(verificarToken, soloAuditor);

router.get('/', listarAuditoria);
router.get('/entidades', obtenerEntidades);
router.get('/:id', obtenerRegistroAuditoria);

export default router;
