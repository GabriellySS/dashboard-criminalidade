import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface UseAnosDisponiveisResult {
  anos: string[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Hook para buscar a lista dinâmica de anos disponíveis no banco de dados.
 *
 * Consome o endpoint GET /api/anos-disponiveis e retorna os anos
 * ordenados em ordem decrescente (mais recente primeiro).
 *
 * Fallback: se o endpoint não estiver disponível, retorna lista vazia
 * para que o filtro de anos exiba apenas "Todos os Anos".
 */
export function useAnosDisponiveis(): UseAnosDisponiveisResult {
  const [anos, setAnos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [fetchCounter, setFetchCounter] = useState(0);

  const isMounted = useRef(true);

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const fetchAnos = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const res = await fetch(`${API_BASE_URL}/api/anos-disponiveis`);

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const data: number[] | { anos: number[] } = await res.json();

        // Suporta tanto resposta como array direto quanto objeto { anos: [...] }
        const rawAnos: number[] = Array.isArray(data) ? data : data.anos ?? [];

        // Ordena em ordem decrescente e converte para string
        const sorted = rawAnos
          .map(Number)
          .filter((n) => !isNaN(n))
          .sort((a, b) => b - a)
          .map(String);

        if (isMounted.current) {
          setAnos(sorted);
        }
      } catch {
        if (isMounted.current) {
          setIsError(true);
          setAnos([]);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchAnos();

    return () => {
      isMounted.current = false;
    };
  }, [fetchCounter]);

  return { anos, isLoading, isError, refetch };
}
