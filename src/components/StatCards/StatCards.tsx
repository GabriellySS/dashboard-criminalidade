import React from 'react';
import { Car, ShieldAlert, FileText } from 'lucide-react';
import styles from './StatCards.module.css';

interface StatCardsProps {
  totalOcorrencias: number;
}

export const StatCards: React.FC<StatCardsProps> = ({ totalOcorrencias }) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  return (
    <div className={styles.cardsContainer}>
      {/* Card 1: Ocorrências Registradas */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <Car size={20} />
          </div>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            ↓ 12.5%
          </span>
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Ocorrências Registradas</span>
          <span className={styles.value}>{formatNumber(totalOcorrencias)}</span>
        </div>
      </div>

      {/* Card 2: Zonas de Alto Risco */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <ShieldAlert size={20} />
          </div>
          <span className={`${styles.badge} ${styles.badgeDanger}`}>
            ↑ 3.2%
          </span>
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Zonas de Alto Risco</span>
          <span className={styles.value}>42</span>
        </div>
      </div>

      {/* Card 3: Efetivo Alocado */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <FileText size={20} />
          </div>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            ↑ 8.4%
          </span>
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Efetivo Alocado</span>
          <span className={styles.value}>2.845</span>
        </div>
      </div>
    </div>
  );
};
