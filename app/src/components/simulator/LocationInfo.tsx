'use client';

import type { Coordinates } from '@/types/map';

interface CellInfo {
  heatIndex: number;
  impervious: number;
  green: number;
  rainRisk: number;
}

interface LocationInfoProps {
  coordinates: Coordinates;
  cellInfo?: CellInfo | null;
  onClose: () => void;
}

export function LocationInfo({ coordinates, cellInfo, onClose }: LocationInfoProps) {
  const [lng, lat] = coordinates;

  return (
    <div className="map-overlay p-4 min-w-[200px]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          선택된 위치
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* 좌표 정보 */}
      <div className="mb-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">경도</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {lng.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">위도</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {lat.toFixed(4)}
          </span>
        </div>
      </div>

      {/* 셀 데이터 정보 */}
      {cellInfo && (
        <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
          <h4 className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            지역 데이터
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-orange-50 p-2 dark:bg-orange-900/20">
              <div className="text-orange-600 dark:text-orange-400">열지수</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(cellInfo.heatIndex * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
              <div className="text-gray-600 dark:text-gray-400">불투수면</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(cellInfo.impervious * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded bg-green-50 p-2 dark:bg-green-900/20">
              <div className="text-green-600 dark:text-green-400">녹지율</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(cellInfo.green * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded bg-blue-50 p-2 dark:bg-blue-900/20">
              <div className="text-blue-600 dark:text-blue-400">강우위험</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(cellInfo.rainRisk * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        시뮬레이션 버튼을 눌러 위험도를 계산하세요
      </p>
    </div>
  );
}
