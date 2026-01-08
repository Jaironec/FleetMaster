// FIX #13: Helper para extraer IP del cliente
import { Request } from 'express';

/**
 * Extrae la IP real del cliente, considerando proxies y load balancers
 */
export function getClientIP(req: Request): string {
    // 1. Verificar header X-Forwarded-For (Proxy/Load Balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // X-Forwarded-For puede contener múltiples IPs: "client, proxy1, proxy2"
        // La primera es la IP original del cliente
        const ips = (forwarded as string).split(',');
        return ips[0].trim();
    }

    // 2. Verificar header X-Real-IP (Nginx, etc.)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp as string;
    }

    // 3. Fallback a IP directa de la conexión
    return req.ip || req.socket.remoteAddress || 'unknown';
}
