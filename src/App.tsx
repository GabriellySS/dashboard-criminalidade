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
  const [regiaoSelecionada, setRegiaoSelecionada] = useState('Capital');
  const [municipioSelecionado, setMunicipioSelecionado] = useState('São Paulo (Capital)');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas');
  const [crimeSelecionado, setCrimeSelecionado] = useState('Todos');
  const [anoSelecionado, setAnoSelecionado] = useState('Todos');
  const [mesSelecionado, setMesSelecionado] = useState('Todos');
  const [isLoading, setIsLoading] = useState(false);
  const [crimeRecords, setCrimeRecords] = useState<CrimeRecord[]>([]);
  const [municipiosData, setMunicipiosData] = useState<any[]>([]);

  // Carrega lista de municípios inicialmente
  useEffect(() => {
    fetch('http://localhost:8000/api/municipios')
      .then(res => res.json())
      .then(data => setMunicipiosData(data))
      .catch(err => console.error('Erro ao carregar municípios:', err));
  }, []);

  // Fetch data with Server-Side Aggregation based on active filters
  useEffect(() => {
    const fetchData = async () => {
      if (municipiosData.length === 0) return;

      setIsLoading(true);
      try {
        let url = `http://localhost:8000/api/ocorrencias?`;
        if (anoSelecionado !== 'Todos') {
          url += `ano=${anoSelecionado}&`;
        }
        if (municipioSelecionado !== 'Todas as cidades' && municipioSelecionado !== 'Todos') {
          url += `municipio=${encodeURIComponent(municipioSelecionado)}&`;
        } else if (regiaoSelecionada !== 'Todas') {
          url += `regiao=${encodeURIComponent(regiaoSelecionada)}&`;
        }

        if (url.endsWith('&') || url.endsWith('?')) {
          url = url.slice(0, -1);
        }

        const resOcorrencias = await fetch(url);

        if (!resOcorrencias.ok) {
          throw new Error('Falha ao carregar dados da API');
        }

        const ocorrenciasData = await resOcorrencias.json();

        // Map months (Integer -> String) to match frontend format
        const MES_MAP_REVERSE: Record<number, string> = {
          1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
          5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
          9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
        };

        // Format occurrences to CrimeRecord[]
        const records: CrimeRecord[] = ocorrenciasData.map((occ: any) => {
          return {
            categoria_crime: occ.categoria_crime,
            mes: MES_MAP_REVERSE[occ.mes] || 'Janeiro',
            ano: String(occ.ano),
            ocorrencias: occ.total_ocorrencias,
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
  }, [municipiosData, municipioSelecionado, regiaoSelecionada, anoSelecionado]); // Fetch data when municipio, region or ano change

  // Dynamic filter list options
  const regioesList = useMemo(() => {
    return Array.from(new Set(municipiosData.map((d) => d.regiao_nome))).sort();
  }, [municipiosData]);

  const municipiosList = useMemo(() => {
    const filtered = regiaoSelecionada === 'Todas'
      ? municipiosData
      : municipiosData.filter((d) => d.regiao_nome === regiaoSelecionada);
    return Array.from(new Set(filtered.map((d) => d.nome))).sort();
  }, [municipiosData, regiaoSelecionada]);

  // We have hardcoded lists for categories since we only have server-side aggregated data
  const categoriasList = useMemo(() => {
    return Array.from(new Set(crimeRecords.map((d) => d.categoria_crime))).sort();
  }, [crimeRecords]);

  // Crimes list will be empty for now since backend doesn't return 'tipo_crime'
  const tiposCrimeList = useMemo(() => {
    return ['Todos'];
  }, []);

  const anosList = useMemo(() => {
    return ['2024', '2023', '2022', '2021'];
  }, []);

  const mesesList = useMemo(() => {
    const MES_ORDEM: Record<string, number> = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4,
      'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8,
      'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12,
    };
    return Array.from(new Set(crimeRecords.map((d) => d.mes))).sort((a, b) => {
      return (MES_ORDEM[a] || 0) - (MES_ORDEM[b] || 0);
    });
  }, [crimeRecords]);

  // Derived filtered data (dadosFiltrados) applied on client for month and category
  const dadosFiltrados = useMemo(() => {
    return crimeRecords.filter((item) => {
      const matchCategoria = categoriaSelecionada === 'Todas' || item.categoria_crime === categoriaSelecionada;
      const matchMes = mesSelecionado === 'Todos' || item.mes === mesSelecionado;
      return matchCategoria && matchMes;
    });
  }, [crimeRecords, categoriaSelecionada, mesSelecionado]);

  // Derived statistics for StatCards
  const stats = useMemo(() => {
    const total = dadosFiltrados.reduce((sum, item) => sum + item.ocorrencias, 0);

    const variacaoTotal: number | null = null; // Backend now only returns 1 year at a time

    // Calculate category mais frequente
    const counts: Record<string, number> = {};
    dadosFiltrados.forEach((item) => {
      counts[item.categoria_crime] = (counts[item.categoria_crime] || 0) + item.ocorrencias;
    });
    let crimeMaisFrequente = '';
    let maxVal = -1;
    Object.entries(counts).forEach(([crime, val]) => {
      if (val > maxVal) {
        maxVal = val;
        crimeMaisFrequente = crime;
      }
    });

    const uniqueMonths = Array.from(new Set(dadosFiltrados.map((item) => item.mes)));
    const numMonths = uniqueMonths.length || 1;
    const mediaMensal = Math.round(total / numMonths);

    return {
      total,
      variacaoTotal,
      crimeMaisFrequente,
      mediaMensal,
    };
  }, [dadosFiltrados]);

  // Adapt the RegionTable to expect new schema. We rename the fields.
  const tableData = dadosFiltrados.map(r => ({
    municipio: r.categoria_crime,
    ocorrencias: r.ocorrencias,
    variacao_mensal: 0,
    regiao: '',
    ano: r.ano,
    mes: r.mes,
    categoria_crime: r.categoria_crime,
    tipo_crime: r.categoria_crime
  }));

  const chartData = dadosFiltrados.map(r => ({
    ...r,
    tipo_crime: r.categoria_crime
  }));

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
                <TrendChart data={chartData} isLoading={true} />
                <CrimeDistributionChart data={chartData} isLoading={true} />
              </div>
              <RegionTable data={tableData} isLoading={true} />
            </>
          ) : dadosFiltrados.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="chartsGrid">
                <TrendChart data={chartData} isLoading={false} />
                <CrimeDistributionChart data={chartData} isLoading={false} />
              </div>
              <RegionTable data={tableData} isLoading={false} />
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
