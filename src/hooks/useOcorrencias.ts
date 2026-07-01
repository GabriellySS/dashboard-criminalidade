import { useState, useEffect, useCallback, useRef } from 'react';
import type { CrimeRecord } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const MES_MAP_REVERSE: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

export interface UseOcorrenciasParams {
  municipio: string;
  regiao: string;
  ano: string;
  tipo_crime?: string;
}

export interface UseOcorrenciasResult {
  data: CrimeRecord[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
}

export function useOcorrencias(
  params: UseOcorrenciasParams,
  enabled: boolean,
): UseOcorrenciasResult {
  const [data, setData] = useState<CrimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Contador de refetch para disparar manualmente sem alterar params
  const [fetchCounter, setFetchCounter] = useState(0);

  // Referência estável para os parâmetros (evita dependências instáveis no useEffect)
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const { municipio, regiao, ano } = paramsRef.current;

    const fetchData = async () => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage(null);

      try {
        const searchParams = new URLSearchParams();

        if (ano !== 'Todos') searchParams.set('ano', ano);
        if (paramsRef.current.tipo_crime && paramsRef.current.tipo_crime !== 'Todos') {
          searchParams.set('tipo_crime', paramsRef.current.tipo_crime);
        }

        const isMunicipio =
          municipio !== 'Todas as cidades' && municipio !== 'Todos' && municipio !== '';
        const isRegiao = regiao !== 'Todas';

        if (isMunicipio) {
          searchParams.set('municipio', municipio);
        } else if (isRegiao) {
          searchParams.set('regiao', regiao);
        }

        const query = searchParams.toString();
        const url = `${API_BASE_URL}/api/ocorrencias${query ? `?${query}` : ''}`;

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(
            `Erro ${res.status}: ${res.statusText || 'Falha ao carregar dados da API'}`,
          );
        }

        const ocorrenciasData = await res.json();

        const records: CrimeRecord[] = ocorrenciasData.map((occ: any) => ({
          categoria_crime: occ.categoria_crime,
          mes: MES_MAP_REVERSE[occ.mes] || 'Janeiro',
          ano: String(occ.ano),
          ocorrencias: occ.total_ocorrencias,
          municipio: occ.municipio || '',
        }));

        setData(records);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro inesperado ao carregar os dados.';
        setIsError(true);
        setErrorMessage(message);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // fetchCounter garante que o refetch manual dispara uma nova busca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, params.municipio, params.regiao, params.ano, params.tipo_crime, fetchCounter]);

  return { data, isLoading, isError, errorMessage, refetch };
}
