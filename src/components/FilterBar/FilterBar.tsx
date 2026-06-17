import React from 'react';
import { Filter, X } from 'lucide-react';
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
  /** Callback para resetar todos os filtros ao estado inicial (UX-02) */
  onClearFilters: () => void;
  /** Número de filtros ativos diferentes do padrão — exibido no botão Limpar (UX-02) */
  activeFiltersCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  regiaoSelecionada,
  setRegiaoSelecionada,
  municipioSelecionado,
  setMunicipioSelecionado,
  categoriaSelecionada,
  setCategoriaSelecionada,
  setCrimeSelecionado,
  anoSelecionado,
  setAnoSelecionado,
  mesSelecionado,
  setMesSelecionado,
  regioesList,
  municipiosList,
  categoriasList,
  anosList,
  mesesList,
  onClearFilters,
  activeFiltersCount,
}) => {
  /**
   * Regra de cascata geográfica:
   * O Combobox de Município permanece desabilitado enquanto "Todas" as regiões
   * estiver selecionada. Quando uma Região específica é escolhida, o Combobox
   * é habilitado e lista apenas os municípios daquela região.
   *
   * UX-05: Passamos `disabledReason` para o MunicipioCombobox exibir microcopy
   * explicativo quando o campo estiver desabilitado, evitando confusão do usuário.
   * Com virtualização, a lista suporta 5.570+ municípios sem degradação de performance.
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
      {/* UX-05: disabledReason exibe tooltip/microcopy quando desabilitado */}
      <div className={styles.filterGroup}>
        <label htmlFor="municipio-combobox">Município</label>
        <MunicipioCombobox
          id="municipio-combobox"
          ariaLabel="Filtrar por Município"
          options={municipiosList}
          value={municipioSelecionado}
          onChange={setMunicipioSelecionado}
          disabled={isMunicipioDisabled}
          disabledReason="Selecione uma região primeiro"
        />
      </div>

      {/* Filtro: Categoria de Crime */}
      {/* UX-04: filtro "Tipo de Crime" removido — backend não expõe tipo_crime.
                 Apenas "Categoria" permanece como filtro de tipologia. */}
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

      {/*
       * ── AÇÕES — UX-03 + UX-02 ───────────────────────────────────────────────
       * Posicionado no extremo direito (padrão de leitura em Z):
       * o usuário percorre os filtros da esquerda → direita e encontra a ação
       * naturalmente ao final do fluxo.
       *
       * "Limpar (N)" fica adjacente ao botão principal para "saída de emergência"
       * rápida (H3 — Controle e Liberdade do Usuário).
       */}
      <div className={styles.actionsGroup}>
        {activeFiltersCount > 0 && (
          <button
            id="clear-filters-btn"
            className={styles.clearButton}
            type="button"
            aria-label={`Limpar ${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''}`}
            onClick={onClearFilters}
            title="Resetar todos os filtros para os valores padrão"
          >
            <X size={14} />
            Limpar ({activeFiltersCount})
          </button>
        )}

        <button
          id="apply-filters-btn"
          className={styles.button}
          type="button"
          aria-label="Aplicar filtros selecionados"
        >
          <Filter size={16} fill="white" />
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
};
