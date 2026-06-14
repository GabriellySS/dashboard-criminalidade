import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { CrimeRecord } from '../../types';
import styles from './RegionTable.module.css';

interface RegionTableProps {
  data: CrimeRecord[];
}

interface RegionRow {
  regiao: string;
  ocorrencias: number;
  variacao: string;
  isUp: boolean;
  status: 'Atenção' | 'Estável';
}

export const RegionTable: React.FC<RegionTableProps> = ({ data }) => {
  const [search, setSearch] = useState('');

  // Dynamically calculate seccional values based on filtered data
  const tableRows = useMemo(() => {
    const spTotal = data
      .filter((item) => item.municipio === 'São Paulo')
      .reduce((sum, item) => sum + item.ocorrencias, 0);

    const cotiaTotal = data
      .filter((item) => item.municipio === 'Cotia')
      .reduce((sum, item) => sum + item.ocorrencias, 0);

    const rows: RegionRow[] = [];

    if (spTotal > 0) {
      rows.push(
        {
          regiao: '1ª Seccional - Centro',
          ocorrencias: Math.round(spTotal * 0.4),
          variacao: '↑ 4.2%',
          isUp: true,
          status: 'Atenção',
        },
        {
          regiao: '2ª Seccional - Sul',
          ocorrencias: Math.round(spTotal * 0.35),
          variacao: '↓ 2.1%',
          isUp: false,
          status: 'Estável',
        },
        {
          regiao: '3ª Seccional - Oeste',
          ocorrencias: Math.round(spTotal * 0.25),
          variacao: '↓ 5.8%',
          isUp: false,
          status: 'Estável',
        }
      );
    }

    if (cotiaTotal > 0) {
      rows.push({
        regiao: 'Delegacia Seccional de Cotia',
        ocorrencias: cotiaTotal,
        variacao: '↓ 8.5%',
        isUp: false,
        status: 'Estável',
      });
    }

    return rows;
  }, [data]);

  const filteredData = useMemo(() => {
    return tableRows.filter((item) =>
      item.regiao.toLowerCase().includes(search.toLowerCase())
    );
  }, [tableRows, search]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Detalhamento por Região</h2>
          <p className={styles.subtitle}>Dados agregados por delegacia seccional</p>
        </div>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar região..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Região / DP</th>
              <th>Ocorrências</th>
              <th>Variação (Mês)</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                  Nenhuma região correspondente encontrada.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.regiao}>
                  <td className={styles.dpCell}>{item.regiao}</td>
                  <td>{formatNumber(item.ocorrencias)}</td>
                  <td className={item.isUp ? styles.variationUp : styles.variationDown}>
                    {item.variacao}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        item.status === 'Atenção' ? styles.badgeAttention : styles.badgeStable
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.actionLink} type="button">
                      Ver Dados
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
