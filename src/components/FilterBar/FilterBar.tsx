import React from 'react';
import { Filter } from 'lucide-react';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  regiaoSelecionada: string;
  setRegiaoSelecionada: (r: string) => void;
  municipioSelecionado: string;
  setMunicipioSelecionado: (m: string) => void;
  crimeSelecionado: string;
  setCrimeSelecionado: (c: string) => void;
  anoSelecionado: string;
  setAnoSelecionado: (a: string) => void;
  mesSelecionado: string;
  setMesSelecionado: (m: string) => void;
  regioesList: string[];
  municipiosList: string[];
  tiposCrimeList: string[];
  anosList: string[];
  mesesList: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  regiaoSelecionada,
  setRegiaoSelecionada,
  municipioSelecionado,
  setMunicipioSelecionado,
  crimeSelecionado,
  setCrimeSelecionado,
  anoSelecionado,
  setAnoSelecionado,
  mesSelecionado,
  setMesSelecionado,
  regioesList,
  municipiosList,
  tiposCrimeList,
  anosList,
  mesesList,
}) => {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <label htmlFor="regiao-select">Região</label>
        <select
          id="regiao-select"
          className={styles.select}
          value={regiaoSelecionada}
          onChange={(e) => {
            setRegiaoSelecionada(e.target.value);
            setMunicipioSelecionado('Todos');
          }}
        >
          <option value="Todas">Todas as Regiões</option>
          {regioesList.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="municipio-select">Município</label>
        <select
          id="municipio-select"
          className={styles.select}
          value={municipioSelecionado}
          onChange={(e) => setMunicipioSelecionado(e.target.value)}
        >
          <option value="Todos">Todos os Municípios</option>
          {municipiosList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="crime-select">Tipo de Crime</label>
        <select
          id="crime-select"
          className={styles.select}
          value={crimeSelecionado}
          onChange={(e) => setCrimeSelecionado(e.target.value)}
        >
          <option value="Todos">Todos os Crimes</option>
          {tiposCrimeList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="ano-select">Ano</label>
        <select
          id="ano-select"
          className={styles.select}
          value={anoSelecionado}
          onChange={(e) => setAnoSelecionado(e.target.value)}
        >
          <option value="Todos">Todos os Anos</option>
          {anosList.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="mes-select">Mês</label>
        <select
          id="mes-select"
          className={styles.select}
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
        >
          <option value="Todos">Todos os Meses</option>
          {mesesList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <button className={styles.button} type="button">
        <Filter size={16} fill="white" />
        Aplicar Filtros
      </button>
    </div>
  );
};
