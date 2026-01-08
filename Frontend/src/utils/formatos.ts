/**
 * Formatea un número como moneda (USD)
 * @param valor - El valor numérico a formatear
 * @returns String con formato de moneda (ej: $1,234.56)
 */
export const formatearMoneda = (valor: number | string | undefined | null): string => {
    if (valor === undefined || valor === null || valor === '') return '$0.00';

    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;

    if (isNaN(numero)) return '$0.00';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(numero);
};

/**
 * Formatea una fecha a formato local
 * @param fecha - Fecha en string o Date
 * @returns String fecha formateada
 */
export const formatearFecha = (fecha: string | Date | undefined): string => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
