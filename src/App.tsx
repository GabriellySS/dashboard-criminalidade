import { useState, useMemo, useEffect } from 'react';
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
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas');
  const [crimeSelecionado, setCrimeSelecionado] = useState('Todos');
  const [anoSelecionado, setAnoSelecionado] = useState('Todos');
  const [mesSelecionado, setMesSelecionado] = useState('Todos');
  const [isLoading, setIsLoading] = useState(false);
  const [crimeRecords, setCrimeRecords] = useState<CrimeRecord[]>([]);

  // Fetch data from real FastAPI routes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [resMunicipios, resOcorrencias] = await Promise.all([
          fetch('http://localhost:8000/api/municipios'),
          fetch('http://localhost:8000/api/ocorrencias')
        ]);

        if (!resMunicipios.ok || !resOcorrencias.ok) {
          throw new Error('Falha ao carregar dados da API');
        }

        const municipiosData = await resMunicipios.json();
        const ocorrenciasData = await resOcorrencias.json();

        // Map municipalities by ID for fast lookup
        const municipiosMap: Record<number, { nome: string; regiao_nome: string }> = {};
        municipiosData.forEach((m: { id: number; nome: string; regiao_nome: string }) => {
          municipiosMap[m.id] = { nome: m.nome, regiao_nome: m.regiao_nome };
        });

        // Map months (Integer -> String) to match frontend format
        const MES_MAP_REVERSE: Record<number, string> = {
          1: "Janeiro",
          2: "Fevereiro",
          3: "Março",
          4: "Abril",
          5: "Maio",
          6: "Junho",
          7: "Julho",
          8: "Agosto",
          9: "Setembro",
          10: "Outubro",
          11: "Novembro",
          12: "Dezembro"
        };

        // Format occurrences to CrimeRecord[]
        const records: CrimeRecord[] = ocorrenciasData.map((occ: any) => {
          const municipioInfo = municipiosMap[occ.municipio_id];
          return {
            id: String(occ.id),
            regiao: municipioInfo ? municipioInfo.regiao_nome : 'Não especificado',
            municipio: municipioInfo ? municipioInfo.nome : 'Não especificado',
            categoria_crime: occ.categoria_macro,
            tipo_crime: occ.nome_crime,
            ano: String(occ.ano),
            mes: MES_MAP_REVERSE[occ.mes] || 'Janeiro',
            ocorrencias: occ.total_ocorrencias,
            variacao_mensal: occ.variacao_mensal
          };
        });

        setCrimeRecords(records);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Simulate loading delay whenever filters change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [regiaoSelecionada, municipioSelecionado, categoriaSelecionada, crimeSelecionado, anoSelecionado, mesSelecionado]);

  // Dynamic filter list options
  const regioesList = useMemo(() => {
    return Array.from(new Set(crimeRecords.map((d) => d.regiao))).sort();
  }, [crimeRecords]);

  // Cascading Filter: municipalities list depends on the selected region
  const municipiosList = useMemo(() => {
    const filtered = regiaoSelecionada === 'Todas'
      ? crimeRecords
      : crimeRecords.filter((d) => d.regiao === regiaoSelecionada);
    return Array.from(new Set(filtered.map((d) => d.municipio))).sort();
  }, [crimeRecords, regiaoSelecionada]);

  // Categoria filter list options
  const categoriasList = useMemo(() => {
    return Array.from(new Set(crimeRecords.map((d) => d.categoria_crime))).sort();
  }, [crimeRecords]);

  // Cascading Filter: types of crime list depends on the selected category
  const tiposCrimeList = useMemo(() => {
    const filtered = categoriaSelecionada === 'Todas'
      ? crimeRecords
      : crimeRecords.filter((d) => d.categoria_crime === categoriaSelecionada);
    return Array.from(new Set(filtered.map((d) => d.tipo_crime))).sort();
  }, [crimeRecords, categoriaSelecionada]);

  const anosList = useMemo(() => {
    return Array.from(new Set(crimeRecords.map((d) => String(d.ano)))).sort((a, b) => b.localeCompare(a));
  }, [crimeRecords]);

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
    return Array.from(new Set(crimeRecords.map((d) => d.mes))).sort((a, b) => {
      return (MES_ORDEM[a] || 0) - (MES_ORDEM[b] || 0);
    });
  }, [crimeRecords]);

  // Derived filtered data (dadosFiltrados)
  const dadosFiltrados = useMemo(() => {
    return crimeRecords.filter((item) => {
      const matchRegiao = regiaoSelecionada === 'Todas' || item.regiao === regiaoSelecionada;
      const matchMunicipio = municipioSelecionado === 'Todos' || item.municipio === municipioSelecionado;
      const matchCategoria = categoriaSelecionada === 'Todas' || item.categoria_crime === categoriaSelecionada;
      const matchCrime = crimeSelecionado === 'Todos' || item.tipo_crime === crimeSelecionado;
      const matchAno = anoSelecionado === 'Todos' || String(item.ano) === anoSelecionado;
      const matchMes = mesSelecionado === 'Todos' || item.mes === mesSelecionado;
      return matchRegiao && matchMunicipio && matchCategoria && matchCrime && matchAno && matchMes;
    });
  }, [crimeRecords, regiaoSelecionada, municipioSelecionado, categoriaSelecionada, crimeSelecionado, anoSelecionado, mesSelecionado]);

  // Derived statistics for StatCards
  const stats = useMemo(() => {
    const total = dadosFiltrados.reduce((sum, item) => sum + item.ocorrencias, 0);

    // Calculate previous period total for variation
    let variacaoTotal: number | null = null;
    if (anoSelecionado !== 'Todos') {
      const prevYear = String(parseInt(anoSelecionado) - 1);
      const hasDataForPrevYear = crimeRecords.some((item) => item.ano === prevYear);
      
      if (hasDataForPrevYear) {
        const prevYearData = crimeRecords.filter((item) => {
          const matchRegiao = regiaoSelecionada === 'Todas' || item.regiao === regiaoSelecionada;
          const matchMunicipio = municipioSelecionado === 'Todos' || item.municipio === municipioSelecionado;
          const matchCategoria = categoriaSelecionada === 'Todas' || item.categoria_crime === categoriaSelecionada;
          const matchCrime = crimeSelecionado === 'Todos' || item.tipo_crime === crimeSelecionado;
          const matchAno = item.ano === prevYear;
          const matchMes = mesSelecionado === 'Todos' || item.mes === mesSelecionado;
          return matchRegiao && matchMunicipio && matchCategoria && matchCrime && matchAno && matchMes;
        });

        if (prevYearData.length > 0) {
          const prevYearTotal = prevYearData.reduce((sum, item) => sum + item.ocorrencias, 0);
          if (prevYearTotal > 0) {
            variacaoTotal = ((total - prevYearTotal) / prevYearTotal) * 100;
          } else if (prevYearTotal === 0 && total === 0) {
            variacaoTotal = 0;
          } else {
            variacaoTotal = 100;
          }
        }
      }
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
  }, [crimeRecords, dadosFiltrados, regiaoSelecionada, municipioSelecionado, categoriaSelecionada, crimeSelecionado, anoSelecionado, mesSelecionado]);

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
