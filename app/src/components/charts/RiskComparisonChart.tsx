'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SimulationMode } from '../../types/simulation';

interface RiskComparisonChartProps {
  beforeRisk: number;
  afterRisk: number;
  mode: SimulationMode;
}

export function RiskComparisonChart({ beforeRisk, afterRisk, mode }: RiskComparisonChartProps) {
  const data = [
    {
      name: 'Before',
      risk: Math.round(beforeRisk * 100),
    },
    {
      name: 'After',
      risk: Math.round(afterRisk * 100),
    },
  ];

  const getBarColor = (risk: number) => {
    if (risk >= 75) return '#ef4444';
    if (risk >= 50) return '#f59e0b';
    if (risk >= 25) return '#eab308';
    return '#22c55e';
  };

  const modeLabel = mode === 'heat' ? '폭염' : '침수';

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, `${modeLabel} 위험도`]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="risk" name={`${modeLabel} 위험도`} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.risk)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
