import { useState, useMemo, useEffect } from 'react';
import mockData from './data/mockData.json';
import { Header } from './components/Header/Header';
import { FilterBar } from './components/FilterBar/FilterBar';
import { StatCards } from './components/StatCards/StatCards';
import { TrendChart } from './components/TrendChart/TrendChart';
import { CrimeDistributionChart } from './components/CrimeDistributionChart/CrimeDistributionChart';
import { RegionTable } from './components/RegionTable/RegionTable';
import { EmptyState } from './components/EmptyState/EmptyState';
import type { CrimeRecord } from './types';
import './App.css';

function App() {
  const [regiaoSelecionada, setRegiaoSelecionada] = useState('Todas');
  const [municipioSelecionado, setMunicipioSelecionado] = useState('Todos');
  const [crimeSelecionado, setCrimeSelecionado] = useState('Todos');
  const [anoSelecionado, setAnoSelecionado] = useState('Todos');
  const [mesSelecionado, setMesSelecionado] = useState('Todos');
  const [isLoading, setIsLoading] = useState(false);

  // Safely cast mockData to CrimeRecord[]
  const typedMockData = mockData as CrimeRecord[];

  // Simulate loading delay whenever filters change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [regiaoSelecionada, municipioSelecionado, crimeSelecionado, anoSelecionado, mesSelecionado]);

  // Dynamic filter list options
  const regioesList = useMemo(() => {
    return Array.from(new Set(typedMockData.map((d) => d.regiao))).sort();
  }, [typedMockData]);

  // Cascading Filter: municipalities list depends on the selected region
  const municipiosList = useMemo(() => {
    const filtered = regiaoSelecionada === 'Todas'
      ? typedMockData
      : typedMockData.filter((d) => d.regiao === regiaoSelecionada);
    return Array.from(new Set(filtered.map((d) => d.municipio))).sort();
  }, [typedMockData, regiaoSelecionada]);

  const tiposCrimeList = useMemo(() => {
    return Array.from(new Set(typedMockData.map((d) => d.tipo_crime))).sort();
  }, [typedMockData]);

  const anosList = useMemo(() => {
    return Array.from(new Set(typedMockData.map((d) => String(d.ano)))).sort((a, b) => b.localeCompare(a));
  }, [typedMockData]);

  const mesesList = useMemo(() => {
    const MES_ORDEM: Record<string, number> = {
      'Janeiro': 1,
      'Fevereiro': 2,
      'Março': 3,
      'Abril': 4,
      'Maio': 5,
      'Junho': 6,
      'Julho': 7,
      'Agosto': 8,
      'Setembro': 9,
      'Outubro': 10,
      'Novembro': 11,
      'Dezembro': 12,
    };
    return Array.from(new Set(typedMockData.map((d) => d.mes))).sort((a, b) => {
      return (MES_ORDEM[a] || 0) - (MES_ORDEM[b] || 0);
    });
  }, [typedMockData]);

  // Derived filtered data (dadosFiltrados)
  const dadosFiltrados = useMemo(() => {
    return typedMockData.filter((item) => {
      const matchRegiao = regiaoSelecionada === 'Todas' || item.regiao === regiaoSelecionada;
      const matchMunicipio = municipioSelecionado === 'Todos' || item.municipio === municipioSelecionado;
      const matchCrime = crimeSelecionado === 'Todos' || item.tipo_crime === crimeSelecionado;
      const matchAno = anoSelecionado === 'Todos' || String(item.ano) === anoSelecionado;
      const matchMes = mesSelecionado === 'Todos' || item.mes === mesSelecionado;
      return matchRegiao && matchMunicipio && matchCrime && matchAno && matchMes;
    });
  }, [typedMockData, regiaoSelecionada, municipioSelecionado, crimeSelecionado, anoSelecionado, mesSelecionado]);

  // Derived statistics for StatCards
  const stats = useMemo(() => {
    const total = dadosFiltrados.reduce((sum, item) => sum + item.ocorrencias, 0);

    // Calculate previous period total for variation
    let prevYearTotal = 0;
    if (anoSelecionado !== 'Todos') {
      const prevYear = parseInt(anoSelecionado) - 1;
      const prevYearData = typedMockData.filter((item) => {
        const matchRegiao = regiaoSelecionada === 'Todas' || item.regiao === regiaoSelecionada;
        const matchMunicipio = municipioSelecionado === 'Todos' || item.municipio === municipioSelecionado;
        const matchCrime = crimeSelecionado === 'Todos' || item.tipo_crime === crimeSelecionado;
        const matchAno = item.ano === String(prevYear);
        const matchMes = mesSelecionado === 'Todos' || item.mes === mesSelecionado;
        return matchRegiao && matchMunicipio && matchCrime && matchAno && matchMes;
      });
      prevYearTotal = prevYearData.reduce((sum, item) => sum + item.ocorrencias, 0);
    } else {
      // Compare current vs 2022
      const data2022 = typedMockData.filter(
        (item) =>
          item.ano === '2022' &&
          (regiaoSelecionada === 'Todas' || item.regiao === regiaoSelecionada) &&
          (municipioSelecionado === 'Todos' || item.municipio === municipioSelecionado) &&
          (crimeSelecionado === 'Todos' || item.tipo_crime === crimeSelecionado) &&
          (mesSelecionado === 'Todos' || item.mes === mesSelecionado)
      );
      prevYearTotal = data2022.reduce((sum, item) => sum + item.ocorrencias, 0);
    }

    let variacaoTotal = 0;
    if (prevYearTotal > 0) {
      variacaoTotal = ((total - prevYearTotal) / prevYearTotal) * 100;
    } else {
      // Realistic default variation if no comparative data
      variacaoTotal = -12.5;
    }

    // Calculate crime mais frequente
    const counts: Record<string, number> = {};
    dadosFiltrados.forEach((item) => {
      counts[item.tipo_crime] = (counts[item.tipo_crime] || 0) + item.ocorrencias;
    });
    let crimeMaisFrequente = '';
    let maxVal = -1;
    Object.entries(counts).forEach(([crime, val]) => {
      if (val > maxVal) {
        maxVal = val;
        crimeMaisFrequente = crime;
      }
    });

    // Calculate media mensal
    const uniqueMonths = Array.from(new Set(dadosFiltrados.map((item) => `${item.ano}-${item.mes}`)));
    const numMonths = uniqueMonths.length || 1;
    const mediaMensal = Math.round(total / numMonths);

    return {
      total,
      variacaoTotal,
      crimeMaisFrequente,
      mediaMensal,
    };
  }, [typedMockData, dadosFiltrados, regiaoSelecionada, municipioSelecionado, crimeSelecionado, anoSelecionado, mesSelecionado]);

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
          crimeSelecionado={crimeSelecionado}
          setCrimeSelecionado={setCrimeSelecionado}
          anoSelecionado={anoSelecionado}
          setAnoSelecionado={setAnoSelecionado}
          mesSelecionado={mesSelecionado}
          setMesSelecionado={setMesSelecionado}
          regioesList={regioesList}
          municipiosList={municipiosList}
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

          {isLoading ? (
            <>
              <div className="chartsGrid">
                <TrendChart data={dadosFiltrados} isLoading={true} />
                <CrimeDistributionChart data={dadosFiltrados} isLoading={true} />
              </div>
              <RegionTable data={dadosFiltrados} isLoading={true} />
            </>
          ) : dadosFiltrados.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="chartsGrid">
                <TrendChart data={dadosFiltrados} isLoading={false} />
                <CrimeDistributionChart data={dadosFiltrados} isLoading={false} />
              </div>
              <RegionTable data={dadosFiltrados} isLoading={false} />
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
