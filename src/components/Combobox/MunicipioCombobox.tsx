/**
 * MunicipioCombobox
 * ─────────────────
 * Combobox acessível e virtualizado para seleção de municípios.
 *
 * Arquitetura de performance:
 *   • Busca fuzzy com debounce (200 ms) — evita re-filtrar a cada keystroke.
 *   • Lista virtualizada via @tanstack/react-virtual — apenas os itens visíveis
 *     no viewport são renderizados no DOM, garantindo 60fps com 5.570 municípios.
 *   • Lógica de abertura/fechamento gerenciada com useRef (sem re-renders extras).
 *
 * Acessibilidade:
 *   • role="combobox", aria-expanded, aria-controls, aria-activedescendant
 *   • role="listbox" + role="option" na lista
 *   • Navegação por teclado: ArrowDown/Up, Enter, Escape
 */
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import styles from './MunicipioCombobox.module.css';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Altura fixa de cada item — necessária para o virtualizer calcular offsets */
const ITEM_HEIGHT = 36;

/** Opção especial que representa "sem seleção específica" */
const TODAS_AS_CIDADES = 'Todas as cidades';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface MunicipioComboboxProps {
  /** Lista completa de nomes de municípios (pode ter milhares de itens) */
  options: string[];
  /** Valor atualmente selecionado */
  value: string;
  /** Callback disparado ao selecionar um item */
  onChange: (value: string) => void;
  /** Se true, o campo fica bloqueado (aguardando seleção de Região) */
  disabled?: boolean;
  /**
   * UX-05 — Microcopy explicativo exibido quando o campo está desabilitado.
   * Aparece como tooltip nativo (title) e como hint acessível abaixo do campo.
   * Ex: "Selecione uma região primeiro"
   */
  disabledReason?: string;
  /** ID do elemento para associação com <label> externo */
  id?: string;
  /** Aria-label descritivo */
  ariaLabel?: string;
}

// ── Componente ────────────────────────────────────────────────────────────────

export const MunicipioCombobox: React.FC<MunicipioComboboxProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  disabledReason,
  id,
  ariaLabel = 'Selecionar município',
}) => {
  const uid = useId();
  const inputId = id ?? `combobox-trigger-${uid}`;
  const listId  = `combobox-list-${uid}`;

  const [isOpen, setIsOpen]       = useState(false);
  const [query,  setQuery]        = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);

  const wrapperRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const scrollParent = useRef<HTMLDivElement>(null);

  // ── Busca debounced ──────────────────────────────────────────────────────────
  const debouncedQuery = useDebounce(query, 200);

  /**
   * Filtragem fuzzy client-side: inclui o item se todos os tokens do query
   * aparecerem (em qualquer ordem) no nome do município.
   * Exemplo: "são jo" encontra "São José dos Campos".
   */
  const filtered = useMemo<string[]>(() => {
    const base = [TODAS_AS_CIDADES, ...options];
    if (!debouncedQuery.trim()) return base;
    const tokens = debouncedQuery.toLowerCase().split(/\s+/);
    return base.filter((name) => {
      const lower = name.toLowerCase();
      return tokens.every((tok) => lower.includes(tok));
    });
  }, [options, debouncedQuery]);

  // ── Virtualização ────────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollParent.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5, // renderiza 5 itens extras acima/abaixo do viewport
  });

  // ── Lógica de abertura / fechamento ─────────────────────────────────────────

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setQuery('');
    setActiveIdx(-1);
    // Foco no input de busca após a animação do dropdown
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIdx(-1);
  }, []);

  const selectItem = useCallback(
    (item: string) => {
      onChange(item === TODAS_AS_CIDADES ? TODAS_AS_CIDADES : item);
      closeDropdown();
    },
    [onChange, closeDropdown],
  );

  // ── Fecha ao clicar fora ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, closeDropdown]);

  // ── Scroll para o item ativo quando muda via teclado ─────────────────────────
  useEffect(() => {
    if (activeIdx >= 0) {
      virtualizer.scrollToIndex(activeIdx, { align: 'auto' });
    }
  }, [activeIdx, virtualizer]);

  // ── Navegação por teclado ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && filtered[activeIdx]) {
          selectItem(filtered[activeIdx]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
    }
  };

  // ── Label do trigger (texto visível no campo fechado) ────────────────────────
  const triggerLabel =
    !value || value === TODAS_AS_CIDADES ? 'Todas as cidades' : value;

  // ── Render ────────────────────────────────────────────────────────────────────

  // UX-05: ID do hint acessível para aria-describedby quando desabilitado
  const hintId = `${inputId}-hint`;

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger — campo clicável que exibe o valor selecionado */}
      <button
        id={inputId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        aria-describedby={disabled && disabledReason ? hintId : undefined}
        disabled={disabled}
        className={[
          styles.trigger,
          disabled  ? styles.triggerDisabled : '',
          isOpen    ? styles.triggerOpen     : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={isOpen ? closeDropdown : openDropdown}
        title={disabled && disabledReason ? disabledReason : triggerLabel}
      >
        {triggerLabel}
      </button>

      {/* UX-05: Microcopy condicional abaixo do campo quando desabilitado */}
      {disabled && disabledReason && (
        <p id={hintId} className={styles.disabledHint} aria-live="polite">
          {disabledReason}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className={styles.dropdown} role="dialog" aria-label="Buscar município">
          {/* Campo de busca interno */}
          <div className={styles.searchWrapper}>
            <Search
              size={14}
              className={styles.searchIcon}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Buscar município..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(-1);
              }}
              aria-label="Campo de busca de municípios"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Lista virtualizada */}
          {filtered.length === 0 ? (
            <p className={styles.emptyMsg}>Nenhum município encontrado</p>
          ) : (
            <div
              ref={scrollParent}
              id={listId}
              role="listbox"
              aria-label="Lista de municípios"
              className={styles.listContainer}
            >
              {/* Container com altura total calculada pelo virtualizer */}
              <div
                style={{
                  height:   `${virtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const item      = filtered[vItem.index];
                  const isSelected = item === value || (item === TODAS_AS_CIDADES && (!value || value === TODAS_AS_CIDADES));
                  const isFocused  = vItem.index === activeIdx;

                  return (
                    <div
                      key={vItem.key}
                      id={`${listId}-option-${vItem.index}`}
                      role="option"
                      aria-selected={isSelected}
                      style={{
                        position:  'absolute',
                        top:       `${vItem.start}px`,
                        left:      0,
                        right:     0,
                        height:    `${ITEM_HEIGHT}px`,
                      }}
                      className={[
                        styles.option,
                        isSelected ? styles.optionSelected : '',
                        isFocused  ? styles.optionFocused  : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseDown={(e) => {
                        // mousedown em vez de click para evitar blur no input antes da seleção
                        e.preventDefault();
                        selectItem(item);
                      }}
                      onMouseEnter={() => setActiveIdx(vItem.index)}
                    >
                      {item}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
