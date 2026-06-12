import React from 'react';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  municipio: string;
  setMunicipio: (m: string) => void;
  tipoCrime: string;
  setTipoCrime: (t: string) => void;
  ano: string;
  setAno: (a: string) => void;
  municipiosList: string[];
  tiposCrimeList: string[];
  anosList: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  municipio,
  setMunicipio,
  tipoCrime,
  setTipoCrime,
  ano,
  setAno,
  municipiosList,
  tiposCrimeList,
  anosList,
}) => {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <label htmlFor="municipio-select">Município</label>
        <select
          id="municipio-select"
          className={styles.select}
          value={municipio}
          onChange={(e) => setMunicipio(e.target.value)}
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
          value={tipoCrime}
          onChange={(e) => setTipoCrime(e.target.value)}
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
          value={ano}
          onChange={(e) => setAno(e.target.value)}
        >
          <option value="Todos">Todos os Anos</option>
          {anosList.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
