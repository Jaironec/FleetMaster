// Configuración de Helmet
// Establece headers de seguridad HTTP para proteger la aplicación

import helmet from 'helmet';

// Configuración personalizada de Helmet
export const helmetConfig = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Permite estilos inline para compatibilidad
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"], // Permite imágenes de Cloudinary y data URIs
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Desactivado para compatibilidad con Cloudinary
    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite recursos de Cloudinary
    // HSTS (HTTP Strict Transport Security)
    hsts: {
        maxAge: 31536000, // 1 año
        includeSubDomains: true,
        preload: true
    },
    // X-Content-Type-Options
    noSniff: true, // Previene MIME type sniffing
    // X-Frame-Options
    frameguard: {
        action: 'deny' // Previene clickjacking
    },
    // X-XSS-Protection (legacy, pero útil para navegadores antiguos)
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin"
    },
});

export default helmetConfig;
