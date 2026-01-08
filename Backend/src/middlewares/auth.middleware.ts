// Middleware de Autenticación con JWT
// Verifica tokens y extrae información del usuario

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RolUsuario } from '@prisma/client';

// Extender el tipo Request para incluir el usuario autenticado
declare global {
    namespace Express {
        interface Request {
            usuario?: {
                id: number;
                nombreUsuario: string;
                rol: RolUsuario;
            };
        }
    }
}

interface PayloadJWT {
    id: number;
    nombreUsuario: string;
    rol: RolUsuario;
}

// Middleware para verificar que el usuario está autenticado
export const verificarToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
            return;
        }

        // El header debe ser: "Bearer <token>"
        const partes = authHeader.split(' ');
        if (partes.length !== 2 || partes[0] !== 'Bearer') {
            res.status(401).json({ error: 'Formato de token inválido. Use: Bearer <token>' });
            return;
        }

        const token = partes[1];
        const secreto = process.env.JWT_SECRET;

        if (!secreto) {
            throw new Error('JWT_SECRET no configurado. La aplicación no puede funcionar sin esta variable.');
        }

        const decoded = jwt.verify(token, secreto) as PayloadJWT;

        // Adjuntar información del usuario al request
        req.usuario = {
            id: decoded.id,
            nombreUsuario: decoded.nombreUsuario,
            rol: decoded.rol
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expirado. Por favor inicie sesión nuevamente.' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        res.status(500).json({ error: 'Error al verificar el token.' });
    }
};

// Middleware para verificar que el usuario es ADMIN (puede modificar datos)
export const soloAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
        res.status(401).json({ error: 'Usuario no autenticado.' });
        return;
    }

    if (req.usuario.rol !== 'ADMIN') {
        res.status(403).json({
            error: 'Acceso denegado. Se requieren permisos de administrador.',
            mensaje: 'Su rol actual es AUDITOR y solo tiene permisos de lectura.'
        });
        return;
    }

    next();
};

// Middleware para verificar que el usuario puede ESCRIBIR (solo ADMIN)
export const puedeEscribir = soloAdmin;  // Alias más descriptivo

// Middleware para verificar que el usuario puede LEER (ADMIN o AUDITOR)
export const puedeLeer = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
        res.status(401).json({ error: 'Usuario no autenticado.' });
        return;
    }

    if (req.usuario.rol !== 'ADMIN' && req.usuario.rol !== 'AUDITOR') {
        res.status(403).json({
            error: 'Acceso denegado.',
            mensaje: 'No tiene permisos para acceder a este recurso.'
        });
        return;
    }

    next();
};

// Middleware que permite tanto ADMIN como AUDITOR (solo lectura)
export const usuarioAutenticado = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
        res.status(401).json({ error: 'Usuario no autenticado.' });
        return;
    }
    next();
};

// Middleware exclusivo para AUDITOR
export const soloAuditor = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
        res.status(401).json({ error: 'Usuario no autenticado.' });
        return;
    }

    if (req.usuario.rol !== 'AUDITOR') {
        res.status(403).json({
            error: 'Acceso denegado. Este módulo es exclusivo para auditores.',
            mensaje: 'Solo el personal de auditoría puede acceder a esta función.'
        });
        return;
    }

    next();
};

// Middleware para AUDITOR o ADMIN (ambos roles permitidos)
export const auditorOAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
        res.status(401).json({ error: 'Usuario no autenticado.' });
        return;
    }

    if (req.usuario.rol !== 'ADMIN' && req.usuario.rol !== 'AUDITOR') {
        res.status(403).json({
            error: 'Acceso denegado.',
            mensaje: 'Se requieren permisos de administrador o auditor.'
        });
        return;
    }

    next();
};

