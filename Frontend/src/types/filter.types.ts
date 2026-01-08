// Tipos para filtros de búsqueda y parámetros de API
// Reemplazan el uso de `const params: any = {}`

import type { EstadoViaje, EstadoPagoCliente, EstadoMantenimiento, EstadoPagoChofer } from './api.types';

// Filtros para listado de Viajes
export interface FiltrosViaje {
    estado?: string;
    vehiculoId?: string;
    choferId?: string;
    clienteId?: string;
    estadoPagoCliente?: string;
    fechaDesde?: string;
    fechaHasta?: string;
}

// Filtros para listado de Auditoría
export interface FiltrosAuditoria {
    entidad?: string;
    usuarioId?: number | string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
}

// Filtros para listado de Mantenimientos
export interface FiltrosMantenimiento {
    vehiculoId?: number | string;
    tipo?: string;
    estado?: EstadoMantenimiento | string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
}

// Filtros para listado de Pagos a Choferes
export interface FiltrosPagoChofer {
    choferId?: number | string;
    estado?: EstadoPagoChofer | string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
}

// Tipo genérico para parámetros de API
export type ApiParams = Record<string, string | number | boolean | undefined>;
