// Punto de entrada principal del servidor
// Sistema de Control de Transporte de Carga Pesada

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Validar variables de entorno ANTES de continuar
import validarVariablesEntorno from './config/env.validation';
validarVariablesEntorno();

// Importar configuraciones de seguridad
import { helmetConfig } from './config/helmet.config';
import { generalLimiter } from './config/rateLimiter.config';
import logger from './config/logger.config';
import { setupSwagger } from './config/swagger.config';

// Importar rutas
import authRoutes from './routes/auth.routes';
import vehiculoRoutes from './routes/vehiculo.routes';
import choferRoutes from './routes/chofer.routes';
import clienteRoutes from './routes/cliente.routes';
import materialRoutes from './routes/material.routes';
import auditoriaRoutes from './routes/auditoria.routes';
import dashboardRoutes from './routes/dashboard.routes';
import viajesRoutes from './routes/viajes.routes';
import gastosRoutes from './routes/gastos.routes';
import mantenimientoRoutes from './routes/mantenimiento.routes';
import pagosChoferRoutes from './routes/pagosChofer.routes';
import reportesRoutes from './routes/reportes.routes';
import alertasRoutes from './routes/alertas.routes';

// Importar servicio de tareas programadas
import { iniciarTareasProgramadas } from './services/scheduler.service';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de seguridad (DEBEN ir primero)
// Helmet: Headers de seguridad HTTP
app.use(helmetConfig);

// Rate Limiting general
app.use('/api', generalLimiter);

// Middlewares globales
// Configurar CORS - permitir acceso desde red local en desarrollo
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        // En desarrollo, permitir cualquier origen de red local (192.168.x.x, 10.x.x.x, etc.)
        if (process.env.NODE_ENV !== 'production') {
            const isLocalNetwork = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
            if (isLocalNetwork) {
                return callback(null, true);
            }
        }
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limitar tamaño del body para prevenir ataques DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logging de peticiones con Winston
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });
    
    next();
});

// Configurar Swagger (antes de las rutas)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    setupSwagger(app);
}

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/choferes', choferRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/materiales', materialRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/viajes', viajesRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/mantenimientos', mantenimientoRoutes);
app.use('/api/pagos-choferes', pagosChoferRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/alertas', alertasRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
    res.json({
        estado: 'ok',
        mensaje: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Manejo global de errores (DEBE ir antes de las rutas para capturar todos los errores)
import { globalErrorHandler } from './middlewares/error.middleware';

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        ruta: req.path
    });
});

// Error handler global (debe ser el último middleware)
app.use(globalErrorHandler);

// Iniciar servidor
app.listen(PORT, () => {
    logger.info('Servidor iniciado', {
        port: PORT,
        url: `http://0.0.0.0:${PORT}`,
        environment: process.env.NODE_ENV || 'development',
    });
    
    console.log('='.repeat(50));
    console.log('🚛 SISTEMA DE CONTROL DE TRANSPORTE');
    console.log('='.repeat(50));
    console.log(`✅ Servidor iniciado en puerto ${PORT}`);
    console.log(`📍 URL Local: http://localhost:${PORT}`);
    console.log(`🌐 URL Red: http://0.0.0.0:${PORT} (accesible desde cualquier IP)`);
    console.log(`🕐 Fecha/Hora: ${new Date().toLocaleString('es-EC')}`);
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
        console.log(`📚 Documentación API: http://localhost:${PORT}/api-docs`);
    }
    console.log('='.repeat(50));

    // Iniciar tareas programadas
    iniciarTareasProgramadas();
});

export default app;

