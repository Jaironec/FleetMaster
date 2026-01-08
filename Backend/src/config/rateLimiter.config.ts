// Configuración de Rate Limiting
// Protege la API contra ataques de fuerza bruta y abuso

import rateLimit from 'express-rate-limit';

// Rate limiter general para todas las rutas
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 requests por IP en 15 minutos
    message: {
        error: 'Demasiadas peticiones desde esta IP',
        mensaje: 'Por favor intente nuevamente en unos minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true, // Retorna rate limit info en headers `RateLimit-*`
    legacyHeaders: false, // Desactiva `X-RateLimit-*` headers
    skip: (req) => {
        // Saltar rate limiting en desarrollo local
        return process.env.NODE_ENV === 'development' && req.ip === '::1';
    }
});

// Rate limiter estricto para autenticación (protege contra fuerza bruta)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Solo 5 intentos de login por IP en 15 minutos
    message: {
        error: 'Demasiados intentos de inicio de sesión',
        mensaje: 'Por favor intente nuevamente después de 15 minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // No contar requests exitosos
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && req.ip === '::1';
    }
});

// Rate limiter para operaciones de escritura (POST, PUT, DELETE)
export const writeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 20, // Máximo 20 operaciones de escritura por IP por minuto
    message: {
        error: 'Demasiadas operaciones de escritura',
        mensaje: 'Por favor reduzca la frecuencia de sus peticiones.',
        retryAfter: '1 minuto'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && req.ip === '::1';
    }
});

// Rate limiter para subida de archivos
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Máximo 10 subidas por IP en 15 minutos
    message: {
        error: 'Demasiadas subidas de archivos',
        mensaje: 'Por favor intente nuevamente después de unos minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && req.ip === '::1';
    }
});

export default {
    general: generalLimiter,
    auth: authLimiter,
    write: writeLimiter,
    upload: uploadLimiter
};
