import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '../Skeleton/Skeleton';
import type { CrimeRecord } from '../../types';
import styles from './CrimeDistributionChart.module.css';

interface CrimeDistributionChartProps {
  data: CrimeRecord[];
  isLoading?: boolean;
}

// Flat Design 2.0 Solid Colors for Crime Categories
const CRIME_COLORS: Record<string, string> = {
  'Furtos': '#3B82F6',           // Flat Blue
  'Roubo de Veículos': '#10B981',  // Flat Emerald
  'Homicídios Dolosos': '#EF4444', // Flat Red
};

// Default fallback color
const DEFAULT_COLOR = '#64748B';

// Custom Tooltip component defined outside render to prevent re-creation/lint warnings
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      percentage: number;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{data.name}</p>
        <p className={styles.tooltipValue}>
          {new Intl.NumberFormat('pt-BR').format(data.value)} ocorrências ({data.payload.percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export const CrimeDistributionChart: React.FC<CrimeDistributionChartProps> = ({
  data,
  isLoading = false,
}) => {
  // 1. Group and sum occurrences per crime type
  const groupMap: Record<string, number> = {};
  let totalOccurrences = 0;

  data.forEach((item) => {
    groupMap[item.tipo_crime] = (groupMap[item.tipo_crime] || 0) + item.ocorrencias;
    totalOccurrences += item.ocorrencias;
  });

  // 2. Prepare chart data
  const chartData = Object.entries(groupMap).map(([crime, occurrences]) => {
    const percentage = totalOccurrences > 0 ? (occurrences / totalOccurrences) * 100 : 0;
    return {
      name: crime,
      value: occurrences,
      percentage,
      color: CRIME_COLORS[crime] || DEFAULT_COLOR,
    };
  }).sort((a, b) => b.value - a.value); // Sort descending

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>Distribuição por Tipo de Crime</h2>
        <p className={styles.chartSubtitle}>Proporção absoluta e percentual das ocorrências</p>
      </div>

      {isLoading ? (
        <div className={styles.chartContent}>
          <Skeleton borderRadius="12px" />
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', minHeight: '260px' }}>
          Nenhum dado disponível para os filtros selecionados.
        </div>
      ) : (
        <div className={styles.chartContent}>
          <div className={styles.legendContainer}>
            {chartData.map((entry, index) => (
              <div key={`legend-${index}`} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: entry.color }}
                />
                <span className={styles.legendLabel}>
                  {entry.name}: {entry.percentage.toFixed(1)}%
                </span>
                <span className={styles.legendValue}>
                  ({new Intl.NumberFormat('pt-BR').format(entry.value)})
                </span>
              </div>
            ))}
          </div>

          <div className={styles.responsiveContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
