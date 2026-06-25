import React from 'react';
import { X } from 'lucide-react';
import { MunicipioCombobox } from '../Combobox/MunicipioCombobox';
import { Skeleton } from '../Skeleton/Skeleton';
import styles from './FilterBar.module.css';

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Identificadores de cada filtro individual — usados pelos chips (UX-01). */
export type FilterKey = 'regiao' | 'municipio' | 'categoria' | 'ano' | 'mes';

interface FilterBarProps {
  // Valores atuais
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
  // Listas de opções
  regioesList: string[];
  municipiosList: string[];
  categoriasList: string[];
  tiposCrimeList: string[];
  anosList: string[];
  mesesList: string[];
  // UX-02: limpar todos
  onClearFilters: () => void;
  activeFiltersCount: number;
  // UX-01: remover filtro individual
  onRemoveFilter: (key: FilterKey) => void;
  // UX-01: mapa de chips ativos {key → label legível}
  activeChips: { key: FilterKey; label: string }[];
  isLoading?: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

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
  onRemoveFilter,
  activeChips,
  isLoading = false,
}) => {
  /**
   * UX-05: Cascata geográfica — Município desabilitado até região ser escolhida.
   * Passamos `disabledReason` para exibir microcopy explicativo.
   */
  const isMunicipioDisabled = regiaoSelecionada === 'Todas';

  return (
    <div className={styles.filterBar}>

      {/*
       * ── LINHA DE FILTROS ─────────────────────────────────────────────────────
       * UX-07: Três grupos semânticos com labels uppercase e separadores visuais.
       * Layout: flex com wrap — grupos ficam lado a lado em desktop e empilham
       * graciosamente em telas menores.
       */}
      <div className={styles.filtersRow}>

        {/* ── GRUPO: GEOGRAFIA ── */}
        <fieldset className={styles.filterGroup} aria-label="Filtros geográficos">
          <legend className={styles.groupLabel}>Geografia</legend>
          <div className={styles.groupFields}>

            <div className={styles.filterField}>
              <label htmlFor="regiao-select" className={styles.fieldLabel}>Região</label>
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
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* UX-05: disabledReason exibe microcopy quando desabilitado */}
            <div className={styles.filterField}>
              <label htmlFor="municipio-combobox" className={styles.fieldLabel}>Município</label>
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

          </div>
        </fieldset>

        <div className={styles.groupDivider} aria-hidden="true" />

        {/* ── GRUPO: TIPOLOGIA ── */}
        {/* UX-04: "Tipo de Crime" foi removido — backend não expõe tipo_crime. */}
        <fieldset className={styles.filterGroup} aria-label="Filtros de tipologia criminal">
          <legend className={styles.groupLabel}>Tipologia</legend>
          <div className={styles.groupFields}>

            <div className={styles.filterField}>
              <label htmlFor="categoria-select" className={styles.fieldLabel}>Categoria</label>
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
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

          </div>
        </fieldset>

        <div className={styles.groupDivider} aria-hidden="true" />

        {/* ── GRUPO: PERÍODO ── */}
        <fieldset className={styles.filterGroup} aria-label="Filtros de período">
          <legend className={styles.groupLabel}>Período</legend>
          <div className={styles.groupFields}>

            <div className={styles.filterField}>
              <label htmlFor="ano-select" className={styles.fieldLabel}>Ano</label>
              <select
                id="ano-select"
                aria-label="Filtrar por Ano"
                className={styles.select}
                value={anoSelecionado}
                onChange={(e) => setAnoSelecionado(e.target.value)}
              >
                <option value="Todos">Todos os Anos</option>
                {anosList.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterField}>
              <label htmlFor="mes-select" className={styles.fieldLabel}>Mês</label>
              {isLoading ? (
                <div style={{ height: '36px', width: '100%' }}>
                  <Skeleton borderRadius="6px" />
                </div>
              ) : (
                <select
                  id="mes-select"
                  aria-label="Filtrar por Mês"
                  className={styles.select}
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                >
                  <option value="Todos">Todos os Meses</option>
                  {mesesList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>

          </div>
        </fieldset>

      </div>

      {/*
       * ── LINHA DE CHIPS — UX-01 ───────────────────────────────────────────────
       * Renderizada apenas quando há filtros diferentes do padrão.
       * Cada chip representa um filtro ativo com botão de remoção individual.
       * "Limpar (N)" — UX-02 — foi movido para o final desta linha, conforme
       * o wireframe da auditoria (Seção 5).
       */}
      {activeChips.length > 0 && (
        <div className={styles.chipsRow} role="group" aria-label="Filtros ativos">
          <span className={styles.chipsLabel}>Filtros ativos:</span>

          <div className={styles.chipsList}>
            {activeChips.map(({ key, label }) => (
              <span key={key} className={styles.chip}>
                <span className={styles.chipText}>{label}</span>
                <button
                  id={`chip-remove-${key}`}
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`Remover filtro ${label}`}
                  onClick={() => onRemoveFilter(key)}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>

          {/* Limpar todos — UX-02: "saída de emergência" ao final dos chips */}
          <button
            id="clear-filters-btn"
            className={styles.clearButton}
            type="button"
            aria-label={`Limpar ${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''}`}
            onClick={onClearFilters}
            title="Resetar todos os filtros para os valores padrão"
          >
            Limpar ({activeFiltersCount})
          </button>
        </div>
      )}

    </div>
  );
};
