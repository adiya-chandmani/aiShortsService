'use client';

import type { Coordinates } from '../../types/map';
import type { SimulationMode } from '../../types/simulation';

export interface RiskZoneData {
  id: string;
  center: Coordinates;
  risk: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface TopRiskZonesProps {
  zones: RiskZoneData[];
  mode: SimulationMode;
  onZoneClick?: (coordinates: Coordinates) => void;
}

const RISK_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const RANK_BADGES = [
  'bg-yellow-400 text-yellow-900',
  'bg-gray-300 text-gray-700',
  'bg-amber-600 text-white',
];

export function TopRiskZones({ zones, mode, onZoneClick }: TopRiskZonesProps) {
  const modeLabel = mode === 'heat' ? '폭염' : '침수';

  if (zones.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          위험 구역 데이터가 없습니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        🚨 {modeLabel} 위험 구역 TOP 3
      </h4>

      <div className="space-y-2">
        {zones.slice(0, 3).map((zone, index) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => onZoneClick?.(zone.center)}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
          >
            {/* 순위 배지 */}
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${RANK_BADGES[index]}`}
            >
              {index + 1}
            </div>

            {/* 위치 정보 */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {zone.center[1].toFixed(4)}°N, {zone.center[0].toFixed(4)}°E
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                클릭하여 위치로 이동
              </div>
            </div>

            {/* 위험도 */}
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {(zone.risk * 100).toFixed(0)}%
              </div>
              <div className="flex items-center justify-end gap-1">
                <div className={`h-2 w-2 rounded-full ${RISK_COLORS[zone.riskLevel]}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {zone.riskLevel === 'critical' ? '위험' : zone.riskLevel === 'high' ? '높음' : '보통'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {zones.length > 3 && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          + {zones.length - 3}개 구역 더 있음
        </p>
      )}
    </div>
  );
}
