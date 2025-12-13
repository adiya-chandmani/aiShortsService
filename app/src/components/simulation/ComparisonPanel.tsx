'use client';

import type { ComparisonData, SimulationMode } from '../../types/simulation';

interface ComparisonPanelProps {
  comparison: ComparisonData | null;
  mode: SimulationMode;
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

export function ComparisonPanel({ comparison, mode }: ComparisonPanelProps) {
  if (!comparison) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800/50">
        <div className="mb-2 text-3xl">📊</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          시뮬레이션을 실행하면
          <br />
          전/후 비교 결과가 표시됩니다
        </p>
      </div>
    );
  }

  const { before, after, changePercent } = comparison;
  const isIncrease = changePercent > 0;
  const modeLabel = mode === 'heat' ? '폭염' : '침수';

  return (
    <div className="space-y-4">
      {/* 변화량 요약 */}
      <div className={`rounded-lg p-4 ${isIncrease ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
        <div className="mb-1 text-sm text-gray-600 dark:text-gray-400">
          {modeLabel} 위험도 변화
        </div>
        <div className={`text-2xl font-bold ${isIncrease ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {isIncrease ? '▲' : '▼'} {Math.abs(changePercent).toFixed(1)}%
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {isIncrease
            ? '도시 요소 변화로 위험도가 증가했습니다'
            : '도시 요소 변화로 위험도가 감소했습니다'}
        </p>
      </div>

      {/* Before / After 비교 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">BEFORE</span>
            <span className={`rounded px-1.5 py-0.5 text-xs text-white ${RISK_COLORS[before.riskLevel]}`}>
              {RISK_LABELS[before.riskLevel]}
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {(before.risk * 100).toFixed(0)}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full ${RISK_COLORS[before.riskLevel]}`}
              style={{ width: `${before.risk * 100}%` }}
            />
          </div>
        </div>

        {/* After */}
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">AFTER</span>
            <span className={`rounded px-1.5 py-0.5 text-xs text-white ${RISK_COLORS[after.riskLevel]}`}>
              {RISK_LABELS[after.riskLevel]}
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {(after.risk * 100).toFixed(0)}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full ${RISK_COLORS[after.riskLevel]}`}
              style={{ width: `${after.risk * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 인사이트 */}
      <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
        <h4 className="mb-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
          💡 인사이트
        </h4>
        <p className="text-xs text-blue-700 dark:text-blue-400">
          {generateInsight(mode, before.risk, after.risk, changePercent)}
        </p>
      </div>
    </div>
  );
}

function generateInsight(
  mode: SimulationMode,
  beforeRisk: number,
  afterRisk: number,
  changePercent: number
): string {
  if (mode === 'heat') {
    if (changePercent > 30) {
      return '녹지 감소와 불투수면 증가로 폭염 취약도가 크게 높아졌습니다. 도시 숲 조성과 쿨링 시설이 필요합니다.';
    } else if (changePercent > 10) {
      return '도시 요소 변화로 폭염 위험이 증가했습니다. 그늘막과 무더위쉼터 확충을 권장합니다.';
    } else if (changePercent < -10) {
      return '녹지 확대와 투수면 증가로 폭염 위험이 감소했습니다. 긍정적인 변화입니다.';
    } else {
      return '도시 요소 변화가 폭염 위험에 미치는 영향이 크지 않습니다.';
    }
  } else {
    if (changePercent > 30) {
      return '불투수면 증가로 침수 위험이 크게 높아졌습니다. 빗물 저류시설과 투수블록 설치가 필요합니다.';
    } else if (changePercent > 10) {
      return '도시화로 침수 위험이 증가했습니다. 하수관 용량 확대와 배수 시스템 점검이 필요합니다.';
    } else if (changePercent < -10) {
      return '침수 방어 시설이 효과적으로 작동하고 있습니다. 유지 관리를 지속하세요.';
    } else {
      return '현재 침수 방어 수준이 적절합니다. 지속적인 모니터링이 필요합니다.';
    }
  }
}
