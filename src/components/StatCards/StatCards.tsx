import React from 'react';
import { Car, ShieldAlert, FileText } from 'lucide-react';
import { Skeleton } from '../Skeleton/Skeleton';
import styles from './StatCards.module.css';

interface StatCardsProps {
  totalOcorrencias: number;
  variacaoTotal: number;
  zonasAltoRisco: number;
  variacaoZonas: number;
  efetivoAlocado: number;
  variacaoEfetivo: number;
  isLoading?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalOcorrencias,
  variacaoTotal,
  zonasAltoRisco,
  variacaoZonas,
  efetivoAlocado,
  variacaoEfetivo,
  isLoading = false,
}) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num));
  };

  const formatPercent = (num: number) => {
    const absVal = Math.abs(num).toFixed(1);
    const sign = num >= 0 ? '↑' : '↓';
    return `${sign} ${absVal}%`;
  };

  // Card 1: decrease is success, increase is danger
  const isOcorrenciasSuccess = variacaoTotal <= 0;
  // Card 2: decrease is success, increase is danger
  const isZonasSuccess = variacaoZonas <= 0;
  // Card 3: increase is success, decrease is danger
  const isEfetivoSuccess = variacaoEfetivo >= 0;

  return (
    <div className={styles.cardsContainer}>
      {/* Card 1: Ocorrências Registradas */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <Car size={20} />
          </div>
          {isLoading ? (
            <Skeleton width="55px" height="20px" borderRadius="9999px" />
          ) : (
            <span className={`${styles.badge} ${isOcorrenciasSuccess ? styles.badgeSuccess : styles.badgeDanger}`}>
              {formatPercent(variacaoTotal)}
            </span>
          )}
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Ocorrências Registradas</span>
          {isLoading ? (
            <div style={{ marginTop: '0.25rem', height: '38px', width: '120px' }}>
              <Skeleton borderRadius="6px" />
            </div>
          ) : (
            <span className={styles.value}>{formatNumber(totalOcorrencias)}</span>
          )}
        </div>
      </div>

      {/* Card 2: Zonas de Alto Risco */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <ShieldAlert size={20} />
          </div>
          {isLoading ? (
            <Skeleton width="55px" height="20px" borderRadius="9999px" />
          ) : (
            <span className={`${styles.badge} ${isZonasSuccess ? styles.badgeSuccess : styles.badgeDanger}`}>
              {formatPercent(variacaoZonas)}
            </span>
          )}
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Zonas de Alto Risco</span>
          {isLoading ? (
            <div style={{ marginTop: '0.25rem', height: '38px', width: '80px' }}>
              <Skeleton borderRadius="6px" />
            </div>
          ) : (
            <span className={styles.value}>{formatNumber(zonasAltoRisco)}</span>
          )}
        </div>
      </div>

      {/* Card 3: Efetivo Alocado */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <FileText size={20} />
          </div>
          {isLoading ? (
            <Skeleton width="55px" height="20px" borderRadius="9999px" />
          ) : (
            <span className={`${styles.badge} ${isEfetivoSuccess ? styles.badgeSuccess : styles.badgeDanger}`}>
              {formatPercent(variacaoEfetivo)}
            </span>
          )}
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Efetivo Alocado</span>
          {isLoading ? (
            <div style={{ marginTop: '0.25rem', height: '38px', width: '100px' }}>
              <Skeleton borderRadius="6px" />
            </div>
          ) : (
            <span className={styles.value}>{formatNumber(efetivoAlocado)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
