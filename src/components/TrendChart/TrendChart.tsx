import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CrimeRecord } from '../../types';
import styles from './TrendChart.module.css';

interface TrendChartProps {
  data: CrimeRecord[];
}

const MESES_ABR: Record<string, string> = {
  'Janeiro': 'Jan',
  'Fevereiro': 'Fev',
  'Março': 'Mar',
  'Abril': 'Abr',
  'Maio': 'Mai',
  'Junho': 'Jun',
  'Julho': 'Jul',
  'Agosto': 'Ago',
  'Setembro': 'Set',
  'Outubro': 'Out',
  'Novembro': 'Nov',
  'Dezembro': 'Dez',
};

const MES_ORDEM: Record<string, number> = {
  'Janeiro': 1,
  'Fevereiro': 2,
  'Março': 3,
  'Abril': 4,
  'Maio': 5,
  'Junho': 6,
  'Julho': 7,
  'Agosto': 8,
  'Setembro': 9,
  'Outubro': 10,
  'Novembro': 11,
  'Dezembro': 12,
};

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  // Aggregate data chronologically by Month/Year
  const aggregatedMap: Record<string, { label: string; valor: number; sortKey: number }> = {};

  data.forEach((item) => {
    const key = `${item.ano}-${item.mes}`;
    const mesIndex = MES_ORDEM[item.mes] || 0;
    const sortKey = item.ano * 100 + mesIndex;

    if (!aggregatedMap[key]) {
      const mesAbr = MESES_ABR[item.mes] || item.mes.substring(0, 3);
      aggregatedMap[key] = {
        label: `${mesAbr}/${String(item.ano).substring(2)}`,
        valor: 0,
        sortKey,
      };
    }
    aggregatedMap[key].valor += item.ocorrencias;
  });

  const chartData = Object.values(aggregatedMap)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((item) => ({
      name: item.label,
      ocorrencias: item.valor,
    }));

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return String(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue}>
            {new Intl.NumberFormat('pt-BR').format(payload[0].value)} ocorrências
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>Evolução Temporal</h2>
        <p className={styles.chartSubtitle}>Total de ocorrências registradas ao longo do tempo</p>
      </div>

      <div className={styles.responsiveContainer}>
        {chartData.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Nenhum dado disponível para os filtros selecionados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: -10,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorOcorrencias" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                stroke="var(--text-secondary)"
                style={{ fontSize: '11px' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="var(--text-secondary)"
                tickFormatter={formatYAxis}
                style={{ fontSize: '11px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="ocorrencias"
                stroke="var(--primary-color)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorOcorrencias)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
