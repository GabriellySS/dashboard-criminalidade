import React from 'react';
import { Filter } from 'lucide-react';
import { MunicipioCombobox } from '../Combobox/MunicipioCombobox';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  regiaoSelecionada: string;
  setRegiaoSelecionada: (r: string) => void;
  municipioSelecionado: string;
  setMunicipioSelecionado: (m: string) => void;
  categoriaSelecionada: string;
  setCategoriaSelecionada: (c: string) => void;
  crimeSelecionado: string;
  setCrimeSelecionado: (c: string) => void;
  anoSelecionado: string;
  setAnoSelecionado: (a: string) => void;
  mesSelecionado: string;
  setMesSelecionado: (m: string) => void;
  regioesList: string[];
  municipiosList: string[];
  categoriasList: string[];
  tiposCrimeList: string[];
  anosList: string[];
  mesesList: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  regiaoSelecionada,
  setRegiaoSelecionada,
  municipioSelecionado,
  setMunicipioSelecionado,
  categoriaSelecionada,
  setCategoriaSelecionada,
  crimeSelecionado,
  setCrimeSelecionado,
  anoSelecionado,
  setAnoSelecionado,
  mesSelecionado,
  setMesSelecionado,
  regioesList,
  municipiosList,
  categoriasList,
  tiposCrimeList,
  anosList,
  mesesList,
}) => {
  /**
   * Regra de cascata geográfica:
   * O Combobox de Município permanece desabilitado enquanto "Todas" as regiões
   * estiver selecionada. Quando uma Região específica é escolhida, o Combobox
   * é habilitado e lista apenas os municípios daquela região.
   *
   * Com a virtualização, a lista suporta 5.570+ municípios sem degradação de
   * performance — apenas os itens visíveis no viewport são renderizados no DOM.
   */
  const isMunicipioDisabled = regiaoSelecionada === 'Todas';

  return (
    <div className={styles.filterBar}>
      {/* Filtro: Região */}
      <div className={styles.filterGroup}>
        <label htmlFor="regiao-select">Região</label>
        <select
          id="regiao-select"
          aria-label="Filtrar por Região"
          className={styles.select}
          value={regiaoSelecionada}
          onChange={(e) => {
            setRegiaoSelecionada(e.target.value);
            setMunicipioSelecionado('Todas as cidades');
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

      {/* Filtro: Município — Combobox virtualizado (substitui <select> nativo) */}
      <div className={styles.filterGroup}>
        <label htmlFor="municipio-combobox">Município</label>
        <MunicipioCombobox
          id="municipio-combobox"
          ariaLabel="Filtrar por Município"
          options={municipiosList}
          value={municipioSelecionado}
          onChange={setMunicipioSelecionado}
          disabled={isMunicipioDisabled}
        />
      </div>

      {/* Filtro: Categoria de Crime */}
      <div className={styles.filterGroup}>
        <label htmlFor="categoria-select">Categoria de Crime</label>
        <select
          id="categoria-select"
          aria-label="Filtrar por Categoria de Crime"
          className={styles.select}
          value={categoriaSelecionada}
          onChange={(e) => {
            setCategoriaSelecionada(e.target.value);
            setCrimeSelecionado('Todos');
          }}
        >
          <option value="Todas">Todas as Categorias</option>
          {categoriasList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro: Tipo de Crime */}
      <div className={styles.filterGroup}>
        <label htmlFor="crime-select">Tipo de Crime</label>
        <select
          id="crime-select"
          aria-label="Filtrar por Tipo de Crime"
          className={styles.select}
          value={crimeSelecionado}
          onChange={(e) => setCrimeSelecionado(e.target.value)}
        >
          {categoriaSelecionada === 'Todas' ? (
            <option value="Todos">Todos os Crimes</option>
          ) : (
            <option value="Todos">Todos os subtipos</option>
          )}
          {tiposCrimeList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro: Ano */}
      <div className={styles.filterGroup}>
        <label htmlFor="ano-select">Ano</label>
        <select
          id="ano-select"
          aria-label="Filtrar por Ano"
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

      {/* Filtro: Mês */}
      <div className={styles.filterGroup}>
        <label htmlFor="mes-select">Mês</label>
        <select
          id="mes-select"
          aria-label="Filtrar por Mês"
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

      <button
        className={styles.button}
        type="button"
        aria-label="Aplicar filtros selecionados"
      >
        <Filter size={16} fill="white" />
        Aplicar Filtros
      </button>
    </div>
  );
};
