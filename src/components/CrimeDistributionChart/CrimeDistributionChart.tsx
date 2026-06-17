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

// Flat Design 2.0 Colors for Top 4 crimes
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
];

// Color for the aggregated "Outros" category
const OUTROS_COLOR = '#64748B'; // Slate Gray

// Default fallback color
const DEFAULT_COLOR = '#94A3B8';

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
    const key = item.tipo_crime ?? item.categoria_crime;
    groupMap[key] = (groupMap[key] || 0) + item.ocorrencias;
    totalOccurrences += item.ocorrencias;
  });

  // 2. Sort all crimes descending by occurrences
  const sortedRawData = Object.entries(groupMap)
    .map(([crime, value]) => ({ name: crime, value }))
    .sort((a, b) => b.value - a.value);

  // 3. Keep top 4 and group the rest into "Outros"
  const top4 = sortedRawData.slice(0, 4);
  const othersRaw = sortedRawData.slice(4);

  const chartData: Array<{ name: string; value: number; percentage: number; color: string }> = [];

  // Add top 4 elements
  top4.forEach((entry, idx) => {
    const percentage = totalOccurrences > 0 ? (entry.value / totalOccurrences) * 100 : 0;
    chartData.push({
      name: entry.name,
      value: entry.value,
      percentage,
      color: PRESET_COLORS[idx] || DEFAULT_COLOR,
    });
  });

  // Aggregate others if present
  if (othersRaw.length > 0) {
    const othersValue = othersRaw.reduce((sum, item) => sum + item.value, 0);
    const othersPercentage = totalOccurrences > 0 ? (othersValue / totalOccurrences) * 100 : 0;
    chartData.push({
      name: 'Outros',
      value: othersValue,
      percentage: othersPercentage,
      color: OUTROS_COLOR,
    });
  }

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
          {/* Custom Legends: Horizontal progress bars occupying 100% width */}
          <div className={styles.legendContainer}>
            {chartData.map((entry, index) => (
              <div key={`legend-${index}`} className={styles.legendItem}>
                {/* Linha Superior (Dados) */}
                <div className={styles.legendHeader}>
                  <div className={styles.legendLeft}>
                    <span
                      className={styles.legendDot}
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className={styles.legendLabel}>{entry.name}</span>
                  </div>
                  <div className={styles.legendRight}>
                    <span className={styles.legendValue}>
                      {new Intl.NumberFormat('pt-BR').format(entry.value)}
                    </span>
                    <span className={styles.legendPercentage}>
                      {entry.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Linha Inferior (Barra de Progresso) */}
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      width: `${entry.percentage}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Physical Donut Chart with totalizer centered */}
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
            
            {/* Centered Totalizer */}
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total
              </span>
              <span style={{ fontSize: '1.35rem', color: 'var(--color-text-primary)', fontWeight: 800 }}>
                {new Intl.NumberFormat('pt-BR').format(totalOccurrences)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
