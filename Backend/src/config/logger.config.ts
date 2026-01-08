// Configuración de Logging Estructurado con Winston
import winston from 'winston';

// Formato personalizado para logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Formato para consola (más legible en desarrollo)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Crear logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: logFormat,
    defaultMeta: { service: 'transporte-backend' },
    transports: [
        // Escribir todos los logs con nivel 'error' y menores a error.log
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Escribir todos los logs a combined.log
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
    ],
});

// Si no estamos en producción, también loguear a la consola
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Helper para logging de requests HTTP
export const logRequest = (req: any, res: any, responseTime?: number) => {
    logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: responseTime ? `${responseTime}ms` : undefined,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
};

// Helper para logging de errores
export const logError = (error: Error, context?: Record<string, unknown>) => {
    logger.error('Error occurred', {
        message: error.message,
        stack: error.stack,
        ...context,
    });
};

export default logger;
