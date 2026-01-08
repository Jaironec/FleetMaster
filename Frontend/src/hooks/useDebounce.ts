import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * Útil para búsquedas y filtros que no deben ejecutarse en cada keystroke
 * 
 * @param value - Valor a aplicar debounce
 * @param delay - Tiempo de espera en ms (default: 300ms)
 * @returns Valor con debounce aplicado
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 * 
 * useEffect(() => {
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
