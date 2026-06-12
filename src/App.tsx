import { useState, useMemo } from 'react';
import mockData from './data/mockData.json';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { StatCards } from './components/StatCards';
import { TrendChart } from './components/TrendChart';
import type { CrimeRecord } from './types';
import styles from './App.module.css';

function App() {
  const [municipio, setMunicipio] = useState('Todos');
  const [tipoCrime, setTipoCrime] = useState('Todos');
  const [ano, setAno] = useState('Todos');

  // Safely cast mockData to CrimeRecord[]
  const typedMockData = mockData as CrimeRecord[];

  // Dynamic filter lists
  const municipiosList = useMemo(() => {
    return Array.from(new Set(typedMockData.map((d) => d.municipio))).sort();
  }, [typedMockData]);

  const tiposCrimeList = useMemo(() => {
    return Array.from(new Set(typedMockData.map((d) => d.tipo_crime))).sort();
  }, [typedMockData]);

  const anosList = useMemo(() => {
    return Array.from(new Set(typedMockData.map((d) => String(d.ano)))).sort((a, b) => b.localeCompare(a));
  }, [typedMockData]);

  // Derived filtered data
  const filteredData = useMemo(() => {
    return typedMockData.filter((item) => {
      const matchMunicipio = municipio === 'Todos' || item.municipio === municipio;
      const matchCrime = tipoCrime === 'Todos' || item.tipo_crime === tipoCrime;
      const matchAno = ano === 'Todos' || String(item.ano) === ano;
      return matchMunicipio && matchCrime && matchAno;
    });
  }, [typedMockData, municipio, tipoCrime, ano]);

  // Derived statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        total: 0,
        media: 0,
        mesMax: '-',
        valorMax: 0,
      };
    }

    const total = filteredData.reduce((sum, item) => sum + item.ocorrencias, 0);

    // Group by month and year to count distinct months and find peak
    const monthlyTotals: Record<string, number> = {};
    filteredData.forEach((item) => {
      const key = `${item.mes}/${item.ano}`;
      monthlyTotals[key] = (monthlyTotals[key] || 0) + item.ocorrencias;
    });

    const activeMonthsCount = Object.keys(monthlyTotals).length;
    const media = activeMonthsCount > 0 ? total / activeMonthsCount : 0;

    let mesMax = '-';
    let valorMax = 0;

    Object.entries(monthlyTotals).forEach(([monthYear, val]) => {
      if (val > valorMax) {
        valorMax = val;
        mesMax = monthYear;
      }
    });

    return {
      total,
      media,
      mesMax,
      valorMax,
    };
  }, [filteredData]);

  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.titleSection}>
          <p className={styles.subtitle}>
            Painel interativo de análise criminal do Estado de São Paulo
          </p>
        </div>

        <FilterBar
          municipio={municipio}
          setMunicipio={setMunicipio}
          tipoCrime={tipoCrime}
          setTipoCrime={setTipoCrime}
          ano={ano}
          setAno={setAno}
          municipiosList={municipiosList}
          tiposCrimeList={tiposCrimeList}
          anosList={anosList}
        />

        <div className={styles.dashboardLayout}>
          <StatCards
            totalOcorrencias={stats.total}
            mediaMensal={stats.media}
            mesMaiorIncidencia={stats.mesMax}
            valorMaiorIncidencia={stats.valorMax}
          />

          <TrendChart data={filteredData} />
        </div>
      </main>
    </>
  );
}

export default App;
