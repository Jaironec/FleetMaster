// Servicio de API - Comunicación con el Backend
import axios from 'axios';
import toast from 'react-hot-toast';
import type {
    ApiResponse,
    PaginatedResponse,
    Usuario,
    LoginResponse,
    Vehiculo,
    Chofer,
    Cliente,
    Material,
    Viaje,
    ViajeDetalle,
    GastoViaje,
    Mantenimiento,
    PagoChofer,
    DashboardStats,
    Alerta,
    RegistroAuditoria,
    // DTOs tipados
    CrearVehiculoDTO,
    ActualizarVehiculoDTO,
    CrearChoferDTO,
    ActualizarChoferDTO,
    CrearClienteDTO,
    ActualizarClienteDTO,
    CrearMaterialDTO,
    ActualizarMaterialDTO,
    CrearViajeDTO,
    ActualizarViajeDTO,
    CrearGastoDTO,
    ActualizarGastoDTO,
    CrearMantenimientoDTO,
    ActualizarMantenimientoDTO,
    CrearPagoChoferDTO,
    ActualizarPagoChoferDTO,
    FiltrosMantenimiento,
    FiltrosPagoChofer,
} from '../types/api.types';

// URL dinámica: usa la misma IP/host del navegador para conectar al backend
const getApiUrl = () => {
    // 1. Si hay variable de entorno explícita, usarla (prioridad)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. Detectar si estamos en Electron o sistema de archivos local
    const isFileProtocol = window.location.protocol === 'file:';
    const isElectron = navigator.userAgent.toLowerCase().includes('electron');

    // Si estamos en Electron, local file, o el hostname está vacío, asumir localhost
    // Esto arregla el error "Failed to construct URL" cuando hostname es ""
    if (isFileProtocol || isElectron || !window.location.hostname) {
        return 'http://localhost:3001/api';
    }

    // 3. Si estamos en navegador web normal (red local/internet), usar la misma IP
    const host = window.location.hostname;
    return `http://${host}:3001/api`;
};

const API_URL = getApiUrl();

// Instancia de Axios configurada
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar token JWT a las peticiones
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Marcar que el toast ya fue mostrado para evitar duplicados en componentes
        error.toastShown = false;

        // 401: No autorizado (Token expirado o inválido)
        // 401: No autorizado (Token expirado o inválido)
        if (error.response?.status === 401) {
            // Ignorar 401 si viene del endpoint de login (credenciales incorrectas)
            if (error.config.url?.includes('/auth/login')) {
                return Promise.reject(error);
            }

            localStorage.removeItem('token');
            localStorage.removeItem('usuario');

            // Usar hash para detectar si estamos en login (Electron/HashRouter)
            const isLoginPage = window.location.hash.includes('/login') || window.location.pathname.includes('/login');

            if (!isLoginPage) {
                window.location.href = '#/login'; // Redirigir usando Hash para Electron
                toast.error('Sesión expirada. Por favor inicie sesión nuevamente.');
                error.toastShown = true;
            }
        }
        // 403: Prohibido
        else if (error.response?.status === 403) {
            toast.error('No tiene permisos para realizar esta acción.');
            error.toastShown = true;
        }
        // 400: Bad Request (Errores de validación)
        else if (error.response?.status === 400) {
            const message = error.response.data?.mensaje || 'Error en la solicitud';

            // Si hay errores detallados de Zod (u otro validador)
            if (error.response.data?.errores && Array.isArray(error.response.data.errores)) {
                // Mostrar el primer error específico
                toast.error(`Error: ${error.response.data.errores[0].mensaje}`);
            } else {
                toast.error(message);
            }
            error.toastShown = true;
        }
        // 404: Not Found
        else if (error.response?.status === 404) {
            // Solo mostrar toast en acciones (no en GETs que pueden ser búsquedas vacías)
            if (error.config.method !== 'get') {
                toast.error(error.response.data?.mensaje || 'Recurso no encontrado');
                error.toastShown = true;
            }
        }
        // 500: Server Error
        else if (error.response?.status >= 500) {
            toast.error('Error interno del servidor. Por favor intente más tarde.');
            error.toastShown = true;
        }
        // Error de red (sin respuesta)
        else if (!error.response) {
            toast.error('No hay conexión con el servidor. Verifique su internet.');
            error.toastShown = true;
        }

        return Promise.reject(error);
    }
);

// ==========================================
// Servicios de Autenticación
// ==========================================

export const authService = {
    login: async (usuario: string, password: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/login', { usuario, password });
        return response.data;
    },

    obtenerPerfil: async (): Promise<ApiResponse<{ usuario: Usuario }>> => {
        const response = await api.get<ApiResponse<{ usuario: Usuario }>>('/auth/perfil');
        return response.data;
    },
};

// ==========================================
// Servicios de Dashboard
// ==========================================

export const dashboardService = {
    obtenerResumen: async (): Promise<ApiResponse<{ resumen: DashboardStats }>> => {
        const response = await api.get<ApiResponse<{ resumen: DashboardStats }>>('/dashboard');
        return response.data;
    },
};

// ==========================================
// Servicios de Vehículos
// ==========================================

export const vehiculoService = {
    listar: async (params?: { busqueda?: string; estado?: string }): Promise<ApiResponse<Vehiculo[]>> => {
        const response = await api.get<ApiResponse<Vehiculo[]>>('/vehiculos', { params });
        return response.data;
    },

    obtener: async (id: number): Promise<ApiResponse<{ vehiculo: Vehiculo }>> => {
        const response = await api.get<ApiResponse<{ vehiculo: Vehiculo }>>(`/vehiculos/${id}`);
        return response.data;
    },

    crear: async (vehiculo: Partial<Vehiculo>): Promise<ApiResponse<{ vehiculo: Vehiculo }>> => {
        const response = await api.post<ApiResponse<{ vehiculo: Vehiculo }>>('/vehiculos', vehiculo);
        return response.data;
    },

    actualizar: async (id: number, vehiculo: Partial<Vehiculo>): Promise<ApiResponse<{ vehiculo: Vehiculo }>> => {
        const response = await api.put<ApiResponse<{ vehiculo: Vehiculo }>>(`/vehiculos/${id}`, vehiculo);
        return response.data;
    },

    eliminar: async (id: number): Promise<ApiResponse<{ vehiculoEliminado: Vehiculo }>> => {
        const response = await api.delete<ApiResponse<{ vehiculoEliminado: Vehiculo }>>(`/vehiculos/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Choferes
// ==========================================

export const choferService = {
    listar: async (params?: { busqueda?: string; estado?: string }) => {
        const response = await api.get('/choferes', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/choferes/${id}`);
        return response.data;
    },

    crear: async (chofer: CrearChoferDTO): Promise<ApiResponse<Chofer>> => {
        const response = await api.post<ApiResponse<Chofer>>('/choferes', chofer);
        return response.data;
    },

    actualizar: async (id: number, chofer: ActualizarChoferDTO): Promise<ApiResponse<Chofer>> => {
        const response = await api.put<ApiResponse<Chofer>>(`/choferes/${id}`, chofer);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/choferes/${id}`);
        return response.data;
    },

    obtenerViajesPendientes: async (id: number) => {
        const response = await api.get(`/choferes/${id}/viajes-pendientes`);
        return response.data;
    }
};

// ==========================================
// Servicios de Clientes
// ==========================================

export const clienteService = {
    listar: async (params?: { busqueda?: string; estado?: string }) => {
        const response = await api.get('/clientes', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/clientes/${id}`);
        return response.data;
    },

    crear: async (cliente: CrearClienteDTO): Promise<ApiResponse<Cliente>> => {
        const response = await api.post<ApiResponse<Cliente>>('/clientes', cliente);
        return response.data;
    },

    actualizar: async (id: number, cliente: ActualizarClienteDTO): Promise<ApiResponse<Cliente>> => {
        const response = await api.put<ApiResponse<Cliente>>(`/clientes/${id}`, cliente);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/clientes/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Materiales
// ==========================================

export const materialService = {
    listar: async (params?: { busqueda?: string }) => {
        const response = await api.get('/materiales', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/materiales/${id}`);
        return response.data;
    },

    crear: async (material: CrearMaterialDTO): Promise<ApiResponse<Material>> => {
        const response = await api.post<ApiResponse<Material>>('/materiales', material);
        return response.data;
    },

    actualizar: async (id: number, material: ActualizarMaterialDTO): Promise<ApiResponse<Material>> => {
        const response = await api.put<ApiResponse<Material>>(`/materiales/${id}`, material);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/materiales/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Viajes
// ==========================================

export const viajeService = {
    listar: async (params?: {
        estado?: string;
        estadoPagoCliente?: string;
        vehiculoId?: number;
        choferId?: number;
        clienteId?: number;
        fechaDesde?: string;
        fechaHasta?: string;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<Viaje>> => {
        const response = await api.get<PaginatedResponse<Viaje>>('/viajes', { params });
        return response.data;
    },

    obtener: async (id: number): Promise<ApiResponse<{ viaje: Viaje; resumenEconomico: unknown; balanceChofer: unknown }>> => {
        const response = await api.get<ApiResponse<{ viaje: Viaje; resumenEconomico: unknown; balanceChofer: unknown }>>(`/viajes/${id}`);
        return response.data;
    },

    crear: async (viaje: Partial<Viaje>): Promise<ApiResponse<{ datos: Viaje }>> => {
        const response = await api.post<ApiResponse<{ datos: Viaje }>>('/viajes', viaje);
        return response.data;
    },

    actualizar: async (id: number, viaje: Partial<Viaje>): Promise<ApiResponse<{ datos: Viaje }>> => {
        const response = await api.put<ApiResponse<{ datos: Viaje }>>(`/viajes/${id}`, viaje);
        return response.data;
    },

    cambiarEstado: async (id: number, estado: string, datosAdicionales?: { fechaLlegadaReal?: string; kilometrosReales?: number }): Promise<ApiResponse<{ datos: Viaje }>> => {
        const response = await api.patch<ApiResponse<{ datos: Viaje }>>(`/viajes/${id}/estado`, { estado, ...datosAdicionales });
        return response.data;
    },

    registrarPago: async (id: number, monto: number): Promise<ApiResponse<unknown>> => {
        const response = await api.post<ApiResponse<unknown>>(`/viajes/${id}/pago`, { monto });
        return response.data;
    },

    eliminar: async (id: number): Promise<ApiResponse> => {
        const response = await api.delete<ApiResponse>(`/viajes/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Gastos de Viaje
// ==========================================

export const gastoService = {
    listarPorViaje: async (viajeId: number) => {
        const response = await api.get(`/viajes/${viajeId}/gastos`);
        return response.data;
    },

    crear: async (viajeId: number, formData: FormData) => {
        const response = await api.post(`/viajes/${viajeId}/gastos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    actualizar: async (id: number, gasto: ActualizarGastoDTO): Promise<ApiResponse<GastoViaje>> => {
        const response = await api.put<ApiResponse<GastoViaje>>(`/gastos/${id}`, gasto);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/gastos/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Mantenimientos
// ==========================================

export const mantenimientoService = {
    listar: async (params?: FiltrosMantenimiento): Promise<PaginatedResponse<Mantenimiento>> => {
        const response = await api.get<PaginatedResponse<Mantenimiento>>('/mantenimientos', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/mantenimientos/${id}`);
        return response.data;
    },

    crear: async (formData: FormData) => {
        const response = await api.post('/mantenimientos', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    iniciar: async (id: number, taller: string) => {
        const response = await api.post(`/mantenimientos/${id}/iniciar`, { taller });
        return response.data;
    },

    completar: async (id: number, formData: FormData) => {
        const response = await api.post(`/mantenimientos/${id}/completar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    cancelar: async (id: number) => {
        const response = await api.post(`/mantenimientos/${id}/cancelar`);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/mantenimientos/${id}`);
        return response.data;
    }
};

// ==========================================
// Servicios de Pagos Choferes
// ==========================================

export const pagoChoferService = {
    listar: async (params?: FiltrosPagoChofer): Promise<PaginatedResponse<PagoChofer>> => {
        const response = await api.get<PaginatedResponse<PagoChofer>>('/pagos-choferes', { params });
        return response.data;
    },

    crear: async (formData: FormData) => {
        const response = await api.post('/pagos-choferes', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    obtenerResumen: async (choferId: number, params?: { fechaDesde?: string; fechaHasta?: string }) => {
        const response = await api.get(`/pagos-choferes/resumen/${choferId}`, { params });
        return response.data;
    },

    marcarPagado: async (pagoId: number, data?: FormData) => {
        const response = await api.patch(`/pagos-choferes/${pagoId}/pagar`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

// ==========================================
// Servicios de Reportes
// ==========================================

export const reportesService = {
    porVehiculo: async (params: { vehiculoId: number; fechaDesde: string; fechaHasta: string }) => {
        const response = await api.get('/reportes/vehiculos', { params });
        return response.data;
    },

    porChofer: async (params: { choferId: number; fechaDesde: string; fechaHasta: string }) => {
        const response = await api.get('/reportes/choferes', { params });
        return response.data;
    },

    porCliente: async (params: { clienteId: number; fechaDesde: string; fechaHasta: string }) => {
        const response = await api.get('/reportes/clientes', { params });
        return response.data;
    },

    cartera: async () => {
        const response = await api.get('/reportes/cartera');
        return response.data;
    },

    general: async (params: { fechaDesde: string; fechaHasta: string }) => {
        const response = await api.get('/reportes/general', { params });
        return response.data;
    }
};

// ==========================================
// Servicios de Alertas
// ==========================================

export const alertasService = {
    obtener: async (): Promise<ApiResponse<{ alertas: Alerta[] }>> => {
        const response = await api.get<ApiResponse<{ alertas: Alerta[] }>>('/alertas');
        return response.data;
    }
};

// ==========================================
// Servicios de Auditoría
// ==========================================

export interface FiltrosAuditoria {
    entidad?: string;
    accion?: string;
    usuarioId?: number;
    desde?: string;
    hasta?: string;
    page?: number;
    limit?: number;
}

export const auditoriaService = {
    listar: async (filtros?: FiltrosAuditoria): Promise<PaginatedResponse<RegistroAuditoria>> => {
        const response = await api.get<PaginatedResponse<RegistroAuditoria>>('/auditoria', { params: filtros });
        return response.data;
    },

    obtenerDetalle: async (id: number): Promise<ApiResponse<{ registro: RegistroAuditoria }>> => {
        const response = await api.get<ApiResponse<{ registro: RegistroAuditoria }>>(`/auditoria/${id}`);
        return response.data;
    },

    obtenerEntidades: async (): Promise<ApiResponse<{ entidades: string[] }>> => {
        const response = await api.get<ApiResponse<{ entidades: string[] }>>('/auditoria/entidades');
        return response.data;
    }
};

export default api;
