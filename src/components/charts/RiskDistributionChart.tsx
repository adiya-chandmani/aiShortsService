'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { SimulationMode } from '@/types/simulation';

interface RiskDistributionData {
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
}

interface RiskDistributionChartProps {
  data: RiskDistributionData;
  mode: SimulationMode;
}

const COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f59e0b',
  critical: '#ef4444',
};

const LABELS = {
  low: '낮음 (0-25%)',
  medium: '보통 (25-50%)',
  high: '높음 (50-75%)',
  critical: '매우 높음 (75-100%)',
};

export function RiskDistributionChart({ data, mode }: RiskDistributionChartProps) {
  const chartData = [
    { name: LABELS.low, value: data.lowRiskCount, color: COLORS.low },
    { name: LABELS.medium, value: data.mediumRiskCount, color: COLORS.medium },
    { name: LABELS.high, value: data.highRiskCount, color: COLORS.high },
    { name: LABELS.critical, value: data.criticalRiskCount, color: COLORS.critical },
  ].filter(item => item.value > 0);

  const total = data.lowRiskCount + data.mediumRiskCount + data.highRiskCount + data.criticalRiskCount;
  const modeLabel = mode === 'heat' ? '폭염' : '침수';

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `${value.toLocaleString()}개 구역 (${((value / total) * 100).toFixed(1)}%)`,
              `${modeLabel} 위험도`,
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
