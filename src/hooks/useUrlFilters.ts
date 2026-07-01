import { useState, useEffect, useCallback } from 'react';


export const DEFAULT_REGIAO    = 'Capital';
export const DEFAULT_MUNICIPIO = 'São Paulo (Capital)';
export const DEFAULT_CATEGORIA = 'Todas';
export const DEFAULT_CRIME     = 'Todos';
export const DEFAULT_ANO       = 'Todos';
export const DEFAULT_MES       = 'Todos';

export function useUrlFilters() {
  const getInitialState = () => {
    const searchParams = new URLSearchParams(window.location.search);
    
    let regiao = searchParams.get('regiao');
    let municipio = searchParams.get('municipio');
    let categoria = searchParams.get('categoria');
    let crime = searchParams.get('crime');
    let ano = searchParams.get('ano');
    let mes = searchParams.get('mes');

    // UX-06: Proteção de cascata
    // Se o usuário tentar acessar a URL com um município preenchido mas sem a região, ignoramos o município
    if (municipio && !regiao) {
      municipio = null;
    }
    // O mesmo para crime sem categoria
    if (crime && !categoria) {
      crime = null;
    }

    return {
      regiao: regiao || DEFAULT_REGIAO,
      municipio: municipio || DEFAULT_MUNICIPIO,
      categoria: categoria || DEFAULT_CATEGORIA,
      crime: crime || DEFAULT_CRIME,
      ano: ano || DEFAULT_ANO,
      mes: mes || DEFAULT_MES,
    };
  };

  const [filters, setFilters] = useState(getInitialState);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    const updateParam = (key: string, value: string, defaultValue: string) => {
      if (value !== defaultValue) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    };

    updateParam('regiao', filters.regiao, DEFAULT_REGIAO);
    updateParam('municipio', filters.municipio, DEFAULT_MUNICIPIO);
    updateParam('categoria', filters.categoria, DEFAULT_CATEGORIA);
    updateParam('crime', filters.crime, DEFAULT_CRIME);
    updateParam('ano', filters.ano, DEFAULT_ANO);
    updateParam('mes', filters.mes, DEFAULT_MES);

    const newUrl = `${window.location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters]);

  useEffect(() => {
    const handlePopState = () => {
      setFilters(getInitialState());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setRegiaoSelecionada = useCallback((val: string | ((prev: string) => string)) => {
    setFilters((prev) => ({ ...prev, regiao: typeof val === 'function' ? val(prev.regiao) : val }));
  }, []);
  
  const setMunicipioSelecionado = useCallback((val: string | ((prev: string) => string)) => {
    setFilters((prev) => ({ ...prev, municipio: typeof val === 'function' ? val(prev.municipio) : val }));
  }, []);

  const setCategoriaSelecionada = useCallback((val: string | ((prev: string) => string)) => {
    setFilters((prev) => ({ ...prev, categoria: typeof val === 'function' ? val(prev.categoria) : val }));
  }, []);

  const setCrimeSelecionado = useCallback((val: string | ((prev: string) => string)) => {
    setFilters((prev) => ({ ...prev, crime: typeof val === 'function' ? val(prev.crime) : val }));
  }, []);

  const setAnoSelecionado = useCallback((val: string | ((prev: string) => string)) => {
    setFilters((prev) => ({ ...prev, ano: typeof val === 'function' ? val(prev.ano) : val }));
  }, []);

  const setMesSelecionado = useCallback((val: string | ((prev: string) => string)) => {
    setFilters((prev) => ({ ...prev, mes: typeof val === 'function' ? val(prev.mes) : val }));
  }, []);

  return {
    regiaoSelecionada: filters.regiao,
    municipioSelecionado: filters.municipio,
    categoriaSelecionada: filters.categoria,
    crimeSelecionado: filters.crime,
    anoSelecionado: filters.ano,
    mesSelecionado: filters.mes,
    setRegiaoSelecionada,
    setMunicipioSelecionado,
    setCategoriaSelecionada,
    setCrimeSelecionado,
    setAnoSelecionado,
    setMesSelecionado,
  };
}
