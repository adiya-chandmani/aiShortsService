'use client';

import type { SimulationResult } from '@/types/simulation';

interface RiskIndicatorProps {
  result: SimulationResult | null;
  label?: string;
}

const RISK_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const RISK_LABELS = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '매우 높음',
};

export function RiskIndicator({ result, label = '위험도' }: RiskIndicatorProps) {
  if (!result) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          시뮬레이션을 실행하세요
        </p>
      </div>
    );
  }

  const percentage = Math.round(result.risk * 100);
  const colorClass = RISK_COLORS[result.riskLevel];
  const levelLabel = RISK_LABELS[result.riskLevel];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${colorClass}`}>
          {levelLabel}
        </span>
      </div>
      <div className="mb-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {percentage}
        </span>
        <span className="text-lg text-gray-500 dark:text-gray-400">%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {result.changePercent !== undefined && (
        <div className="mt-2 text-sm">
          <span className={result.changePercent > 0 ? 'text-red-500' : 'text-green-500'}>
            {result.changePercent > 0 ? '▲' : '▼'} {Math.abs(result.changePercent).toFixed(1)}%
          </span>
          <span className="text-gray-500 dark:text-gray-400"> 변화</span>
        </div>
      )}
    </div>
  );
}
