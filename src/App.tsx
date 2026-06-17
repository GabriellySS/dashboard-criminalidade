import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { FilterBar } from './components/FilterBar/FilterBar';
import { StatCards } from './components/StatCards/StatCards';
import { TrendChart } from './components/TrendChart/TrendChart';
import { CrimeDistributionChart } from './components/CrimeDistributionChart/CrimeDistributionChart';
import { EmptyState } from './components/EmptyState/EmptyState';
import { ErrorState } from './components/ErrorState/ErrorState';
import { useOcorrencias } from './hooks/useOcorrencias';
import { useAnosDisponiveis } from './hooks/useAnosDisponiveis';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function App() {
  const [regiaoSelecionada, setRegiaoSelecionada] = useState('Capital');
  const [municipioSelecionado, setMunicipioSelecionado] = useState('São Paulo (Capital)');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas');
  const [crimeSelecionado, setCrimeSelecionado] = useState('Todos');
  const [anoSelecionado, setAnoSelecionado] = useState('Todos');
  const [mesSelecionado, setMesSelecionado] = useState('Todos');
  const [municipiosData, setMunicipiosData] = useState<any[]>([]);
  const [municipiosError, setMunicipiosError] = useState<string | null>(null);
  const [municipiosRetryKey, setMunicipiosRetryKey] = useState(0);

  // ─── Hook: anos disponíveis (dinâmico via /api/anos-disponiveis) ──────────
  const {
    anos: anosDisponiveis,
    isError: isAnosError,
  } = useAnosDisponiveis();

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

  // Tipo de crime: inoperante até o backend expor o campo (FRONTEND-02 pendente)
  const tiposCrimeList = useMemo(() => ['Todos'], []);

  // Lista de anos: dinâmica via hook useAnosDisponiveis, decrescente.
  // Fallback para lista vazia enquanto carrega ou em caso de erro no endpoint.
  const anosList = useMemo(() => {
    // Se o endpoint retornar anos, usa. Se houver erro ou estiver vazio, não exibe anos hardcoded.
    return isAnosError ? [] : anosDisponiveis;
  }, [anosDisponiveis, isAnosError]);

  const mesesList = useMemo(() => {
    const MES_ORDEM: Record<string, number> = {
      Janeiro: 1, Fevereiro: 2, Março: 3, Abril: 4,
      Maio: 5, Junho: 6, Julho: 7, Agosto: 8,
      Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
    };
    return Array.from(new Set(crimeRecords.map((d) => d.mes))).sort(
      (a, b) => (MES_ORDEM[a] || 0) - (MES_ORDEM[b] || 0),
    );
  }, [crimeRecords]);

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
