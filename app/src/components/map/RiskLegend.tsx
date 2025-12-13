'use client';

import type { SimulationMode } from '@/types/simulation';

interface RiskLegendProps {
  mode: SimulationMode;
}

// layerManager.ts의 색상과 일치
const HEAT_LEGEND = [
  { label: '안전', color: '#10b981', range: '0-30%' },
  { label: '양호', color: '#84cc16', range: '30-50%' },
  { label: '주의', color: '#fbbf24', range: '50-70%' },
  { label: '경고', color: '#f97316', range: '70-85%' },
  { label: '위험', color: '#ef4444', range: '85-100%' },
];

const FLOOD_LEGEND = [
  { label: '안전', color: '#a5f3fc', range: '0-30%' },
  { label: '양호', color: '#22d3ee', range: '30-50%' },
  { label: '주의', color: '#0ea5e9', range: '50-70%' },
  { label: '경고', color: '#2563eb', range: '70-85%' },
  { label: '위험', color: '#4f46e5', range: '85-100%' },
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
