// Tipos para manejo de errores de API
// Reemplaza el uso de `catch (error: any)` con tipado seguro

export interface ApiError {
    toastShown?: boolean;
    code?: string; // Axios error codes like 'ERR_NETWORK', 'ECONNABORTED', etc.
    response?: {
        status?: number;
        data?: {
            mensaje?: string;
            error?: string;
            errores?: Array<{ campo: string; mensaje: string }>;
        };
    };
    message?: string;
    config?: {
        method?: string;
    };
}

// Type guard para validar si un error es ApiError
export function isApiError(error: unknown): error is ApiError {
    return typeof error === 'object' && error !== null;
}

// Helper para extraer mensaje de error
export function getErrorMessage(error: unknown, defaultMessage: string = 'Error desconocido'): string {
    if (isApiError(error)) {
        return error.response?.data?.mensaje || error.response?.data?.error || error.message || defaultMessage;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return defaultMessage;
}

// Helper para verificar si el toast ya fue mostrado
export function wasToastShown(error: unknown): boolean {
    return isApiError(error) && error.toastShown === true;
}
