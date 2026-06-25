import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { FilterBar } from './components/FilterBar/FilterBar';
import type { FilterKey } from './components/FilterBar/FilterBar';
import { StatCards } from './components/StatCards/StatCards';
import { TrendChart } from './components/TrendChart/TrendChart';
import { CrimeDistributionChart } from './components/CrimeDistributionChart/CrimeDistributionChart';
import { EmptyState } from './components/EmptyState/EmptyState';
import { ErrorState } from './components/ErrorState/ErrorState';
import { useOcorrencias } from './hooks/useOcorrencias';
import { useAnosDisponiveis } from './hooks/useAnosDisponiveis';
import { useTiposCrime } from './hooks/useTiposCrime';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Valores padrão dos filtros (usados pelo botão Limpar Filtros) ───────────
const DEFAULT_REGIAO    = 'Capital';
const DEFAULT_MUNICIPIO = 'São Paulo (Capital)';
const DEFAULT_CATEGORIA = 'Todas';
const DEFAULT_CRIME     = 'Todos';
const DEFAULT_ANO       = 'Todos';
const DEFAULT_MES       = 'Todos';

const MES_ORDEM: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, Março: 3, Abril: 4,
  Maio: 5, Junho: 6, Julho: 7, Agosto: 8,
  Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

function App() {
  const [regiaoSelecionada, setRegiaoSelecionada] = useState(DEFAULT_REGIAO);
  const [municipioSelecionado, setMunicipioSelecionado] = useState(DEFAULT_MUNICIPIO);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(DEFAULT_CATEGORIA);
  const [crimeSelecionado, setCrimeSelecionado] = useState(DEFAULT_CRIME);
  const [anoSelecionado, setAnoSelecionado] = useState(DEFAULT_ANO);
  const [mesSelecionado, setMesSelecionado] = useState(DEFAULT_MES);
  const [municipiosData, setMunicipiosData] = useState<any[]>([]);
  const [municipiosError, setMunicipiosError] = useState<string | null>(null);
  const [municipiosRetryKey, setMunicipiosRetryKey] = useState(0);

  // ─── Hook: anos disponíveis (dinâmico via /api/anos-disponiveis) ──────────
  const {
    anos: anosDisponiveis,
    isError: isAnosError,
  } = useAnosDisponiveis();

  // ─── Hook: tipos de crime (dinâmico via /api/tipos-crime) ─────────────────
  const {
    tiposCrime: tiposCrimeListResult,
  } = useTiposCrime(categoriaSelecionada);

  // ─── Hook: ocorrências com tratamento de erro e retry ─────────────────────
  const {
    data: crimeRecords,
    isLoading,
    isError: isOcorrenciasError,
    errorMessage: ocorrenciasErrorMessage,
    refetch: refetchOcorrencias,
  } = useOcorrencias(
    {
      municipio: municipioSelecionado,
      regiao: regiaoSelecionada,
      ano: anoSelecionado,
      tipo_crime: crimeSelecionado,
    },
    municipiosData.length > 0,
  );

  // ─── Carrega lista de municípios (inicialmente, sem depender de filtros) ──
  useEffect(() => {
    let cancelled = false;

    const fetchMunicipios = async () => {
      setMunicipiosError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/municipios`);
        if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) setMunicipiosData(data);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Erro ao carregar municípios';
          setMunicipiosError(msg);
        }
      }
    };

    fetchMunicipios();
    return () => { cancelled = true; };
  }, [municipiosRetryKey]);

  // ─── Listas dinâmicas de filtros ──────────────────────────────────────────
  const regioesList = useMemo(() => {
    return Array.from(new Set(municipiosData.map((d) => d.regiao_nome))).sort();
  }, [municipiosData]);

  const municipiosList = useMemo(() => {
    const filtered =
      regiaoSelecionada === 'Todas'
        ? municipiosData
        : municipiosData.filter((d) => d.regiao_nome === regiaoSelecionada);
    return Array.from(new Set(filtered.map((d) => d.nome))).sort();
  }, [municipiosData, regiaoSelecionada]);

  const categoriasList = useMemo(() => {
    return Array.from(new Set(crimeRecords.map((d) => d.categoria_crime))).sort();
  }, [crimeRecords]);

  const tiposCrimeList = useMemo(() => {
    return tiposCrimeListResult.length > 0 ? tiposCrimeListResult : [];
  }, [tiposCrimeListResult]);

  // Lista de anos: dinâmica via hook useAnosDisponiveis, decrescente.
  // Fallback para lista vazia enquanto carrega ou em caso de erro no endpoint.
  const anosList = useMemo(() => {
    // Se o endpoint retornar anos, usa. Se houver erro ou estiver vazio, não exibe anos hardcoded.
    return isAnosError ? [] : anosDisponiveis;
  }, [anosDisponiveis, isAnosError]);

  const mesesList = useMemo(() => {
    return Array.from(new Set(crimeRecords.map((d) => d.mes))).sort(
      (a, b) => (MES_ORDEM[a] || 0) - (MES_ORDEM[b] || 0),
    );
  }, [crimeRecords]);

  // ─── UX-02: Conta filtros ativos (diferentes do valor padrão) ────────────
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (regiaoSelecionada    !== DEFAULT_REGIAO)    count++;
    if (municipioSelecionado !== DEFAULT_MUNICIPIO) count++;
    if (categoriaSelecionada !== DEFAULT_CATEGORIA) count++;
    if (crimeSelecionado     !== DEFAULT_CRIME)     count++;
    if (anoSelecionado       !== DEFAULT_ANO)       count++;
    if (mesSelecionado       !== DEFAULT_MES)       count++;
    return count;
  }, [regiaoSelecionada, municipioSelecionado, categoriaSelecionada, crimeSelecionado, anoSelecionado, mesSelecionado]);

  // ─── UX-02: Reset de todos os filtros para os valores iniciais ───────────
  const handleClearFilters = () => {
    setRegiaoSelecionada(DEFAULT_REGIAO);
    setMunicipioSelecionado(DEFAULT_MUNICIPIO);
    setCategoriaSelecionada(DEFAULT_CATEGORIA);
    setCrimeSelecionado(DEFAULT_CRIME);
    setAnoSelecionado(DEFAULT_ANO);
    setMesSelecionado(DEFAULT_MES);
  };

  // ─── UX-01: Remove um filtro individual, resetando-o ao valor padrão ──────
  const handleRemoveFilter = (key: FilterKey) => {
    switch (key) {
      case 'regiao':
        setRegiaoSelecionada(DEFAULT_REGIAO);
        // Ao resetar a região ao padrão, o município também volta ao padrão
        setMunicipioSelecionado(DEFAULT_MUNICIPIO);
        break;
      case 'municipio':
        setMunicipioSelecionado(DEFAULT_MUNICIPIO);
        break;
      case 'categoria':
        setCategoriaSelecionada(DEFAULT_CATEGORIA);
        setCrimeSelecionado(DEFAULT_CRIME);
        break;
      case 'crime':
        setCrimeSelecionado(DEFAULT_CRIME);
        break;
      case 'ano':
        setAnoSelecionado(DEFAULT_ANO);
        break;
      case 'mes':
        setMesSelecionado(DEFAULT_MES);
        break;
    }
  };

  // ─── UX-01: Constrói a lista de chips com label legível para cada filtro ativo
  const activeChips = useMemo(() => {
    const chips: { key: FilterKey; label: string }[] = [];
    if (regiaoSelecionada    !== DEFAULT_REGIAO)    chips.push({ key: 'regiao',    label: regiaoSelecionada });
    if (municipioSelecionado !== DEFAULT_MUNICIPIO) chips.push({ key: 'municipio', label: municipioSelecionado });
    if (categoriaSelecionada !== DEFAULT_CATEGORIA) chips.push({ key: 'categoria', label: categoriaSelecionada });
    if (crimeSelecionado     !== DEFAULT_CRIME)     chips.push({ key: 'crime',     label: crimeSelecionado });
    if (anoSelecionado       !== DEFAULT_ANO)       chips.push({ key: 'ano',       label: `Ano: ${anoSelecionado}` });
    if (mesSelecionado       !== DEFAULT_MES)       chips.push({ key: 'mes',       label: mesSelecionado });
    return chips;
  }, [regiaoSelecionada, municipioSelecionado, categoriaSelecionada, crimeSelecionado, anoSelecionado, mesSelecionado]);

  // ─── Dados filtrados (cliente: mês + categoria) ───────────────────────────
  const dadosFiltrados = useMemo(() => {
    return crimeRecords.filter((item) => {
      const matchCategoria =
        categoriaSelecionada === 'Todas' || item.categoria_crime === categoriaSelecionada;
      const matchMes = mesSelecionado === 'Todos' || item.mes === mesSelecionado;
      return matchCategoria && matchMes;
    });
  }, [crimeRecords, categoriaSelecionada, mesSelecionado]);

  // ─── Estatísticas derivadas ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = dadosFiltrados.reduce((sum, item) => sum + item.ocorrencias, 0);

    const counts: Record<string, number> = {};
    dadosFiltrados.forEach((item) => {
      counts[item.categoria_crime] = (counts[item.categoria_crime] || 0) + item.ocorrencias;
    });

    let crimeMaisFrequente = '';
    let maxVal = -1;
    Object.entries(counts).forEach(([crime, val]) => {
      if (val > maxVal) { maxVal = val; crimeMaisFrequente = crime; }
    });

    const uniqueMonths = Array.from(new Set(dadosFiltrados.map((item) => item.mes)));
    const numMonths = uniqueMonths.length || 1;
    const mediaMensal = Math.round(total / numMonths);

    return { total, variacaoTotal: null as number | null, crimeMaisFrequente, mediaMensal };
  }, [dadosFiltrados]);

  const chartData = useMemo(
    () => dadosFiltrados.map((r) => ({ ...r, tipo_crime: r.categoria_crime })),
    [dadosFiltrados],
  );

  // ─── Estado de erro no carregamento de municípios ─────────────────────────
  if (municipiosError) {
    return (
      <>
        <Header />
        <main className="container">
          <div className="titleSection">
            <p className="subtitle">Painel interativo de análise criminal do Estado de São Paulo</p>
          </div>
          <ErrorState
            errorMessage={municipiosError}
            onRetry={() => setMunicipiosRetryKey((k) => k + 1)}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container">
        <div className="titleSection">
          <p className="subtitle">
            Painel interativo de análise criminal do Estado de São Paulo
          </p>
        </div>

        <FilterBar
          regiaoSelecionada={regiaoSelecionada}
          setRegiaoSelecionada={setRegiaoSelecionada}
          municipioSelecionado={municipioSelecionado}
          setMunicipioSelecionado={setMunicipioSelecionado}
          categoriaSelecionada={categoriaSelecionada}
          setCategoriaSelecionada={setCategoriaSelecionada}
          crimeSelecionado={crimeSelecionado}
          setCrimeSelecionado={setCrimeSelecionado}
          anoSelecionado={anoSelecionado}
          setAnoSelecionado={setAnoSelecionado}
          mesSelecionado={mesSelecionado}
          setMesSelecionado={setMesSelecionado}
          regioesList={regioesList}
          municipiosList={municipiosList}
          categoriasList={categoriasList}
          tiposCrimeList={tiposCrimeList}
          anosList={anosList}
          mesesList={mesesList}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
          onRemoveFilter={handleRemoveFilter}
          activeChips={activeChips}
          isLoading={isLoading}
        />

        <div className="dashboardLayout">
          <StatCards
            totalOcorrencias={stats.total}
            variacaoTotal={stats.variacaoTotal}
            crimeMaisFrequente={stats.crimeMaisFrequente}
            mediaMensal={stats.mediaMensal}
            isLoading={isLoading}
          />

          {isOcorrenciasError ? (
            <ErrorState
              errorMessage={ocorrenciasErrorMessage}
              onRetry={refetchOcorrencias}
            />
          ) : isLoading ? (
            <div className="chartsGrid">
              <TrendChart data={chartData} isLoading={true} />
              <CrimeDistributionChart data={chartData} isLoading={true} />
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="chartsGrid">
              <TrendChart data={chartData} isLoading={false} />
              <CrimeDistributionChart data={chartData} isLoading={false} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
