import { useState, useEffect } from 'react';

/**
 * Hook que retorna um valor "atrasado" (debounced), disparando a atualização
 * somente após `delay` ms de inatividade do input.
 *
 * Usado pelo <MunicipioCombobox> para evitar filtrar a lista a cada keystroke,
 * mantendo a UI fluida mesmo com milhares de itens.
 *
 * @param value  Valor a ser debounced (ex: string do input de busca)
 * @param delay  Tempo de espera em ms (padrão: 200ms)
 */
export function useDebounce<T>(value: T, delay = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
