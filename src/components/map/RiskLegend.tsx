'use client';

import type { SimulationMode } from '@/types/simulation';

interface RiskLegendProps {
  mode: SimulationMode;
}

const HEAT_LEGEND = [
  { label: '매우 낮음', color: '#3b82f6', range: '0-25%' },
  { label: '낮음', color: '#22c55e', range: '25-50%' },
  { label: '높음', color: '#f59e0b', range: '50-75%' },
  { label: '매우 높음', color: '#ef4444', range: '75-100%' },
];

const FLOOD_LEGEND = [
  { label: '안전', color: '#3b82f6', range: '0-25%' },
  { label: '주의', color: '#06b6d4', range: '25-50%' },
  { label: '경계', color: '#f59e0b', range: '50-75%' },
  { label: '심각', color: '#1e3a8a', range: '75-100%' },
];

export function RiskLegend({ mode }: RiskLegendProps) {
  const legend = mode === 'heat' ? HEAT_LEGEND : FLOOD_LEGEND;
  const title = mode === 'heat' ? '폭염 위험도' : '침수 위험도';

  return (
    <div className="map-overlay p-3">
      <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
        {title}
      </h4>
      <div className="space-y-1">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="h-3 w-6 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {item.label}
            </span>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              {item.range}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
