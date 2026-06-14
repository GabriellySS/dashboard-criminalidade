import React from 'react';
import { Activity, AlertTriangle, Calendar } from 'lucide-react';
import { Skeleton } from '../Skeleton/Skeleton';
import styles from './StatCards.module.css';

interface StatCardsProps {
  totalOcorrencias: number;
  variacaoTotal: number | null;
  crimeMaisFrequente: string;
  mediaMensal: number;
  isLoading?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalOcorrencias,
  variacaoTotal,
  crimeMaisFrequente,
  mediaMensal,
  isLoading = false,
}) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num));
  };

  const formatPercent = (num: number | null) => {
    if (num === null) return '';
    const absVal = Math.abs(num).toFixed(1);
    const sign = num >= 0 ? '↑' : '↓';
    return `${sign} ${absVal}%`;
  };

  const isOcorrenciasSuccess = variacaoTotal !== null && variacaoTotal <= 0;

  return (
    <div className={styles.cardsContainer}>
      {/* Card 1: Total de Ocorrências */}
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Activity size={20} />
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <span className={styles.label}>Total de Ocorrências</span>
            {variacaoTotal !== null && (
              isLoading ? (
                <Skeleton width="55px" height="20px" borderRadius="9999px" />
              ) : (
                <span className={`${styles.badge} ${isOcorrenciasSuccess ? styles.badgeSuccess : styles.badgeDanger}`}>
                  {formatPercent(variacaoTotal)}
                </span>
              )
            )}
          </div>
          {isLoading ? (
            <div style={{ marginTop: '0.25rem', height: '38px', width: '120px' }}>
              <Skeleton borderRadius="6px" />
            </div>
          ) : (
            <span className={styles.value}>{formatNumber(totalOcorrencias)}</span>
          )}
        </div>
      </div>

      {/* Card 2: Crime Mais Frequente */}
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={20} />
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <span className={styles.label}>Crime Mais Frequente</span>
          </div>
          {isLoading ? (
            <div style={{ marginTop: '0.25rem', height: '38px', width: '150px' }}>
              <Skeleton borderRadius="6px" />
            </div>
          ) : (
            <span className={styles.value} style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {crimeMaisFrequente || 'Nenhum'}
            </span>
          )}
        </div>
      </div>

      {/* Card 3: Média Mensal */}
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Calendar size={20} />
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <span className={styles.label}>Média Mensal</span>
          </div>
          {isLoading ? (
            <div style={{ marginTop: '0.25rem', height: '38px', width: '100px' }}>
              <Skeleton borderRadius="6px" />
            </div>
          ) : (
            <span className={styles.value}>{formatNumber(mediaMensal)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
