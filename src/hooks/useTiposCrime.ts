import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface UseTiposCrimeResult {
  tiposCrime: string[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Hook para buscar a lista dinâmica de tipos de crime no banco de dados.
 *
 * Consome o endpoint GET /api/tipos-crime?categoria={categoria}
 */
export function useTiposCrime(categoria: string): UseTiposCrimeResult {
  const [tiposCrime, setTiposCrime] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [fetchCounter, setFetchCounter] = useState(0);

  const isMounted = useRef(true);

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const fetchTipos = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const url = new URL(`${API_BASE_URL}/api/tipos-crime`);
        if (categoria && categoria !== 'Todas') {
          url.searchParams.append('categoria', categoria);
        }

        const res = await fetch(url.toString());

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const data: string[] = await res.json();

        if (isMounted.current) {
          setTiposCrime(data);
        }
      } catch {
        if (isMounted.current) {
          setIsError(true);
          setTiposCrime([]);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchTipos();

    return () => {
      isMounted.current = false;
    };
  }, [categoria, fetchCounter]);

  return { tiposCrime, isLoading, isError, refetch };
}
