import { useCallback } from 'react';

/**
 * Hook con funciones de formateo memoizadas
 * Evita recrear las funciones en cada render
 * 
 * @example
 * const { formatearFecha, formatearMoneda } = useFormatters();
 */
export function useFormatters() {
    /**
     * Formatea una fecha ISO a formato legible con hora
     */
    const formatearFecha = useCallback((fecha: string | undefined | null): string => {
        if (!fecha) return '-';
        try {
            return new Date(fecha).toLocaleDateString('es-EC', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '-';
        }
    }, []);

    /**
     * Formatea un número a moneda USD
     */
    const formatearMoneda = useCallback((valor: number | undefined | null): string => {
        if (valor === undefined || valor === null) return '$0.00';
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(valor);
    }, []);

    /**
     * Formatea una fecha ISO a formato solo fecha (sin hora)
     */
    const formatearFechaSolo = useCallback((fecha: string | undefined | null): string => {
        if (!fecha) return '-';
        try {
            return new Date(fecha).toLocaleDateString('es-EC', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return '-';
        }
    }, []);

    /**
     * Formatea una fecha ISO a formato corto (DD/MM/YYYY)
     */
    const formatearFechaCorta = useCallback((fecha: string | undefined | null): string => {
        if (!fecha) return '-';
        try {
            return new Date(fecha).toLocaleDateString('es-EC');
        } catch {
            return '-';
        }
    }, []);

    return {
        formatearFecha,
        formatearMoneda,
        formatearFechaSolo,
        formatearFechaCorta
    };
}

export default useFormatters;
