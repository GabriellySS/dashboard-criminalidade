import React from 'react';
import { BarChart3, CalendarDays, TrendingUp } from 'lucide-react';
import styles from './StatCards.module.css';

interface StatCardsProps {
  totalOcorrencias: number;
  mediaMensal: number;
  mesMaiorIncidencia: string;
  valorMaiorIncidencia: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalOcorrencias,
  mediaMensal,
  mesMaiorIncidencia,
  valorMaiorIncidencia,
}) => {
  // Format numbers to local PT-BR string format
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(num);
  };

  return (
    <div className={styles.cardsContainer}>
      <div className={`${styles.card} ${styles.totalCard}`}>
        <div className={styles.iconWrapper}>
          <TrendingUp size={24} />
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Total de Ocorrências</span>
          <span className={styles.value}>{formatNumber(totalOcorrencias)}</span>
          <span className={styles.subtext}>Nos filtros selecionados</span>
        </div>
      </div>

      <div className={`${styles.card} ${styles.mediaCard}`}>
        <div className={styles.iconWrapper}>
          <BarChart3 size={24} />
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Média Mensal</span>
          <span className={styles.value}>{formatNumber(mediaMensal)}</span>
          <span className={styles.subtext}>Ocorrências por mês ativo</span>
        </div>
      </div>

      <div className={`${styles.card} ${styles.maxCard}`}>
        <div className={styles.iconWrapper}>
          <CalendarDays size={24} />
        </div>
        <div className={styles.cardContent}>
          <span className={styles.label}>Maior Incidência</span>
          <span className={styles.value}>{mesMaiorIncidencia || '-'}</span>
          <span className={styles.subtext}>
            {valorMaiorIncidencia > 0 ? `${formatNumber(valorMaiorIncidencia)} ocorrências` : 'Sem dados'}
          </span>
        </div>
      </div>
    </div>
  );
};
