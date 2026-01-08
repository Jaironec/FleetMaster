// Rutas de Reportes
import { Router } from 'express';
import { reportesController } from '../controllers/reportes.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

// GET /api/reportes/vehiculos
router.get('/vehiculos', reportesController.reportePorVehiculo);

// GET /api/reportes/choferes
router.get('/choferes', reportesController.reportePorChofer);

// GET /api/reportes/clientes
router.get('/clientes', reportesController.reportePorCliente);

// Export routes
router.get('/vehiculos/export', reportesController.exportarReporteVehiculo);
router.get('/choferes/export', reportesController.exportarReporteChofer);
router.get('/clientes/export', reportesController.exportarReporteCliente);

// Reporte General Global
router.get('/general', reportesController.reporteGeneral);
router.get('/general/export', reportesController.exportarReporteGeneral);


// Reporte mensual comparativo
router.get('/mensual-comparativo', reportesController.reporteMensualComparativo);

// Reporte de Cartera (Cuentas por Cobrar)
router.get('/cartera', reportesController.reporteCartera);

export default router;
