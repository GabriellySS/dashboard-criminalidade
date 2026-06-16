import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Skeleton } from '../Skeleton/Skeleton';
import type { CrimeRecord } from '../../types';
import styles from './RegionTable.module.css';

interface RegionTableProps {
  data: CrimeRecord[];
  isLoading?: boolean;
}

export const RegionTable: React.FC<RegionTableProps> = ({ data, isLoading = false }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page on search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  // Dynamically determine how to label the first column based on filters present in data
  const uniqueMunicipios = useMemo(() => Array.from(new Set(data.map((d) => d.municipio))), [data]);
  const uniqueCrimes = useMemo(() => Array.from(new Set(data.map((d) => d.tipo_crime))), [data]);

  const showCrimeOnly = uniqueMunicipios.length === 1;
  const showMunicipioOnly = uniqueCrimes.length === 1;

  const getLabel = (item: CrimeRecord) => {
    const muni = item.municipio || 'Região';
    const crime = item.tipo_crime || item.categoria_crime || 'Crime';
    if (showCrimeOnly && !showMunicipioOnly) {
      return crime;
    }
    if (showMunicipioOnly && !showCrimeOnly) {
      return muni;
    }
    return `${muni} / ${crime}`;
  };

  const searchedData = useMemo(() => {
    return data.filter((item) => {
      const searchLower = search.toLowerCase();
      const muni = (item.municipio || 'Região').toLowerCase();
      const crime = (item.tipo_crime || item.categoria_crime || '').toLowerCase();
      return muni.includes(searchLower) || crime.includes(searchLower);
    });
  }, [data, search]);

  const totalPages = Math.ceil(searchedData.length / itemsPerPage) || 1;
  const currentPageAdjusted = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPageAdjusted - 1) * itemsPerPage;
    return searchedData.slice(startIndex, startIndex + itemsPerPage);
  }, [searchedData, currentPageAdjusted, itemsPerPage]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatPercent = (num: number) => {
    const absVal = Math.abs(num).toFixed(1);
    const sign = num >= 0 ? '↑' : '↓';
    return `${sign} ${absVal}%`;
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Detalhamento de Ocorrências</h2>
          <p className={styles.subtitle}>Análise granular das ocorrências registradas</p>
        </div>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar município ou crime..."
            aria-label="Buscar município ou crime"
            className={styles.searchInput}
            value={search}
            onChange={handleSearchChange}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Município / Crime</th>
              <th>Ocorrências</th>
              <th>Variação</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Render skeleton rows while loading
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skel-row-${idx}`}>
                  <td>
                    <Skeleton height="20px" width="180px" borderRadius="4px" />
                  </td>
                  <td>
                    <Skeleton height="20px" width="60px" borderRadius="4px" />
                  </td>
                  <td>
                    <Skeleton height="20px" width="50px" borderRadius="4px" />
                  </td>
                  <td>
                    <Skeleton height="20px" width="70px" borderRadius="9999px" />
                  </td>
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2.5rem 1rem' }}>
                  Nenhuma ocorrência correspondente encontrada.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => {
                const isAlerta = (item.variacao_mensal || 0) > 0;
                const uniqueKey = item.id || `${item.municipio}-${item.categoria_crime}-${item.mes}-${item.ano}-${idx}`;
                return (
                  <tr key={uniqueKey}>
                    <td className={styles.dpCell}>{getLabel(item)}</td>
                    <td>{formatNumber(item.ocorrencias)}</td>
                    <td className={isAlerta ? styles.variationUp : styles.variationDown}>
                      {formatPercent(item.variacao_mensal || 0)}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          isAlerta ? styles.badgeAttention : styles.badgeStable
                        }`}
                      >
                        {isAlerta ? 'Alerta' : 'Estável/Queda'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Página <strong>{currentPageAdjusted}</strong> de {totalPages} ({searchedData.length} itens)
          </span>
          <div className={styles.pageButtons}>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPageAdjusted === 1}
              aria-label="Ir para a página anterior"
            >
              Anterior
            </button>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPageAdjusted === totalPages}
              aria-label="Ir para a próxima página"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
