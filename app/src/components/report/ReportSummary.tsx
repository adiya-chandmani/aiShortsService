'use client';

import type { SimulationMode, SimulationState, ComparisonData } from '../../types/simulation';

interface ReportSummaryProps {
  mode: SimulationMode;
  state: SimulationState;
  comparison: ComparisonData | null;
  locationName?: string;
}

export function ReportSummary({ mode, state, comparison, locationName }: ReportSummaryProps) {
  const modeLabel = mode === 'heat' ? '폭염' : '침수';
  const modeIcon = mode === 'heat' ? '🌡️' : '🌊';

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* 헤더 */}
      <div className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{modeIcon}</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {modeLabel} 위험도 시뮬레이션 리포트
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate()}
            </p>
          </div>
        </div>
      </div>

      {/* 시뮬레이션 설정 */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          시뮬레이션 설정
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {mode === 'heat' && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400">녹지 감소</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {state.greenReduction}%
              </div>
            </div>
          )}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">불투수면 증가</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {state.imperviousIncrease}%
            </div>
          </div>
          {mode === 'heat' ? (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400">무더위쉼터</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {state.shelterEnabled ? '활성화' : '비활성화'}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400">침수 방어 시설</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {state.floodDefenseEnabled ? '가동' : '미가동'}
              </div>
            </div>
          )}
          {locationName && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400">분석 지역</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {locationName}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 결과 요약 */}
      {comparison && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            결과 요약
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-600 dark:bg-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">변경 전</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {(comparison.before.risk * 100).toFixed(0)}%
              </div>
              <div className={`mt-1 inline-block rounded px-2 py-0.5 text-xs text-white ${
                comparison.before.riskLevel === 'critical' ? 'bg-red-500' :
                comparison.before.riskLevel === 'high' ? 'bg-orange-500' :
                comparison.before.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}>
                {comparison.before.riskLevel === 'critical' ? '매우 높음' :
                 comparison.before.riskLevel === 'high' ? '높음' :
                 comparison.before.riskLevel === 'medium' ? '보통' : '낮음'}
              </div>
            </div>

            <div className={`rounded-lg p-4 text-center ${
              comparison.changePercent > 0
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="text-xs text-gray-500 dark:text-gray-400">변화량</div>
              <div className={`mt-1 text-2xl font-bold ${
                comparison.changePercent > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {comparison.changePercent > 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {comparison.changePercent > 0 ? '위험도 증가' : '위험도 감소'}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-600 dark:bg-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">변경 후</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {(comparison.after.risk * 100).toFixed(0)}%
              </div>
              <div className={`mt-1 inline-block rounded px-2 py-0.5 text-xs text-white ${
                comparison.after.riskLevel === 'critical' ? 'bg-red-500' :
                comparison.after.riskLevel === 'high' ? 'bg-orange-500' :
                comparison.after.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}>
                {comparison.after.riskLevel === 'critical' ? '매우 높음' :
                 comparison.after.riskLevel === 'high' ? '높음' :
                 comparison.after.riskLevel === 'medium' ? '보통' : '낮음'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
