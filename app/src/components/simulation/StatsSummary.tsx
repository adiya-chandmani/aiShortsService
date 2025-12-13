'use client';

import type { SimulationMode } from '../../types/simulation';

interface StatsData {
  totalCells: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  averageRisk: number;
  maxRisk: number;
}

interface StatsSummaryProps {
  stats: StatsData | null;
  mode: SimulationMode;
}

export function StatsSummary({ stats, mode }: StatsSummaryProps) {
  if (!stats) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          지도에서 위험도 레이어를 로드하면
          <br />
          통계가 표시됩니다
        </p>
      </div>
    );
  }

  const modeLabel = mode === 'heat' ? '폭염' : '침수';
  const modeIcon = mode === 'heat' ? '🌡️' : '🌊';

  const getRiskPercent = (count: number) => ((count / stats.totalCells) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* 요약 헤더 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {modeIcon} {modeLabel} 위험 통계
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {stats.totalCells.toLocaleString()}개 구역
        </span>
      </div>

      {/* 평균/최대 위험도 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">평균 위험도</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {(stats.averageRisk * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <div className="text-xs text-red-600 dark:text-red-400">최대 위험도</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {(stats.maxRisk * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 위험도별 분포 */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          위험도 분포
        </div>

        {/* 낮음 */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <span className="flex-1 text-xs text-gray-600 dark:text-gray-300">낮음</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {stats.lowRiskCount.toLocaleString()}
          </span>
          <span className="w-12 text-right text-xs text-gray-500">
            {getRiskPercent(stats.lowRiskCount)}%
          </span>
        </div>

        {/* 보통 */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-yellow-500" />
          <span className="flex-1 text-xs text-gray-600 dark:text-gray-300">보통</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {stats.mediumRiskCount.toLocaleString()}
          </span>
          <span className="w-12 text-right text-xs text-gray-500">
            {getRiskPercent(stats.mediumRiskCount)}%
          </span>
        </div>

        {/* 높음 */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-orange-500" />
          <span className="flex-1 text-xs text-gray-600 dark:text-gray-300">높음</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {stats.highRiskCount.toLocaleString()}
          </span>
          <span className="w-12 text-right text-xs text-gray-500">
            {getRiskPercent(stats.highRiskCount)}%
          </span>
        </div>

        {/* 매우 높음 */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="flex-1 text-xs text-gray-600 dark:text-gray-300">매우 높음</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {stats.criticalRiskCount.toLocaleString()}
          </span>
          <span className="w-12 text-right text-xs text-gray-500">
            {getRiskPercent(stats.criticalRiskCount)}%
          </span>
        </div>

        {/* 분포 바 */}
        <div className="mt-2 flex h-2 overflow-hidden rounded-full">
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${getRiskPercent(stats.lowRiskCount)}%` }}
          />
          <div
            className="bg-yellow-500 transition-all duration-300"
            style={{ width: `${getRiskPercent(stats.mediumRiskCount)}%` }}
          />
          <div
            className="bg-orange-500 transition-all duration-300"
            style={{ width: `${getRiskPercent(stats.highRiskCount)}%` }}
          />
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${getRiskPercent(stats.criticalRiskCount)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
