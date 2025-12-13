'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapViewer, RiskLegend } from '@/components/map';
import {
  SimulationPanel,
  ComparisonPanel,
  StatsSummary,
  TopRiskZones,
  type RiskZoneData,
} from '@/components/simulation';
import { MapProvider, useMapContext } from '@/contexts/MapContext';
import { SimulationProvider, useSimulationContext } from '@/contexts/SimulationContext';
import { CitySelector } from './CitySelector';
import { LocationInfo } from './LocationInfo';
import {
  generateGyeonggiGrid,
  findNearestCell,
  createRiskGeoJSON,
  type GridCell,
} from '@/lib/data/sampleData';
import { updateRiskLayer, removeRiskLayer } from '@/lib/map/layerManager';
import { calculateHeatRisk, getRiskLevel } from '@/lib/simulation/heatRisk';
import { calculateFloodRisk, getRiskLevel as getFloodRiskLevel } from '@/lib/simulation/floodRisk';
import type { Coordinates } from '@/types/map';
import type { Map } from 'maplibre-gl';

function SimulatorContent() {
  const router = useRouter();
  const { setMap, setSelectedLocation, selectedLocation } = useMapContext();
  const { state, setState, afterResult, comparison, isLoading, runSimulation } = useSimulationContext();
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [showRiskLayer, setShowRiskLayer] = useState(true);

  // 그리드 데이터 초기화
  useEffect(() => {
    const gridData = generateGyeonggiGrid();
    setGrid(gridData);
  }, []);

  // 선택된 위치에 가장 가까운 셀 찾기
  useEffect(() => {
    if (selectedLocation && grid.length > 0) {
      const cell = findNearestCell(grid, selectedLocation);
      setSelectedCell(cell);
    } else {
      setSelectedCell(null);
    }
  }, [selectedLocation, grid]);

  // 지도 로드 시 위험도 레이어 추가
  const handleMapLoad = useCallback((map: Map) => {
    setMap(map);
    setMapInstance(map);
  }, [setMap]);

  // 위험도 레이어 업데이트
  useEffect(() => {
    if (!mapInstance || grid.length === 0) return;

    // 레이어 숨김 시 제거
    if (!showRiskLayer) {
      removeRiskLayer(mapInstance);
      return;
    }

    // 시뮬레이션 파라미터 적용한 위험도 계산
    const geojson = createRiskGeoJSON(grid, (cell) => {
      if (state.mode === 'heat') {
        return calculateHeatRisk({
          ...cell.heatParams,
          greenReduction: state.greenReduction / 100,
          imperviousIncrease: state.imperviousIncrease / 100,
          shelterEnabled: state.shelterEnabled,
        });
      } else {
        return calculateFloodRisk({
          ...cell.floodParams,
          imperviousIncrease: state.imperviousIncrease / 100,
          floodDefenseEnabled: state.floodDefenseEnabled,
        });
      }
    });

    updateRiskLayer(mapInstance, geojson, state.mode);
  }, [mapInstance, grid, state, showRiskLayer]);

  const handleMapClick = useCallback((coordinates: Coordinates) => {
    setSelectedLocation(coordinates);
  }, [setSelectedLocation]);

  const handleSimulate = useCallback(() => {
    if (!selectedCell) {
      // 선택된 위치가 없으면 기본값 사용
      if (state.mode === 'heat') {
        runSimulation({
          heatIndex: 0.5,
          impervious: 0.4,
          green: 0.35,
        });
      } else {
        runSimulation({
          rainRisk: 0.4,
          floodTrace: 0.25,
          impervious: 0.4,
          riverProximity: 0.2,
        });
      }
      return;
    }

    // 선택된 셀의 실제 데이터 사용
    if (state.mode === 'heat') {
      runSimulation(selectedCell.heatParams);
    } else {
      runSimulation(selectedCell.floodParams);
    }
  }, [state.mode, selectedCell, runSimulation]);

  const handleCitySelect = useCallback((coordinates: Coordinates) => {
    if (mapInstance) {
      mapInstance.flyTo({
        center: coordinates,
        zoom: 12,
        duration: 1500,
      });
    }
    setSelectedLocation(coordinates);
  }, [mapInstance, setSelectedLocation]);

  // 선택된 셀 정보
  const cellInfo = useMemo(() => {
    if (!selectedCell) return null;

    const params = state.mode === 'heat' ? selectedCell.heatParams : selectedCell.floodParams;
    return {
      heatIndex: selectedCell.heatParams.heatIndex,
      impervious: params.impervious,
      green: selectedCell.heatParams.green,
      rainRisk: selectedCell.floodParams.rainRisk,
    };
  }, [selectedCell, state.mode]);

  // 통계 데이터 계산
  const stats = useMemo(() => {
    if (grid.length === 0) return null;

    let lowCount = 0;
    let mediumCount = 0;
    let highCount = 0;
    let criticalCount = 0;
    let totalRisk = 0;
    let maxRisk = 0;

    grid.forEach((cell) => {
      const risk = state.mode === 'heat'
        ? calculateHeatRisk({
            ...cell.heatParams,
            greenReduction: state.greenReduction / 100,
            imperviousIncrease: state.imperviousIncrease / 100,
            shelterEnabled: state.shelterEnabled,
          })
        : calculateFloodRisk({
            ...cell.floodParams,
            imperviousIncrease: state.imperviousIncrease / 100,
            floodDefenseEnabled: state.floodDefenseEnabled,
          });

      totalRisk += risk;
      maxRisk = Math.max(maxRisk, risk);

      if (risk < 0.25) lowCount++;
      else if (risk < 0.5) mediumCount++;
      else if (risk < 0.75) highCount++;
      else criticalCount++;
    });

    return {
      totalCells: grid.length,
      lowRiskCount: lowCount,
      mediumRiskCount: mediumCount,
      highRiskCount: highCount,
      criticalRiskCount: criticalCount,
      averageRisk: totalRisk / grid.length,
      maxRisk,
    };
  }, [grid, state]);

  // TOP 위험 구역
  const topRiskZones = useMemo((): RiskZoneData[] => {
    if (grid.length === 0) return [];

    const getRiskLevelFn = state.mode === 'heat' ? getRiskLevel : getFloodRiskLevel;

    const zonesWithRisk = grid.map((cell) => {
      const risk = state.mode === 'heat'
        ? calculateHeatRisk({
            ...cell.heatParams,
            greenReduction: state.greenReduction / 100,
            imperviousIncrease: state.imperviousIncrease / 100,
            shelterEnabled: state.shelterEnabled,
          })
        : calculateFloodRisk({
            ...cell.floodParams,
            imperviousIncrease: state.imperviousIncrease / 100,
            floodDefenseEnabled: state.floodDefenseEnabled,
          });

      return {
        id: cell.id,
        center: cell.center,
        risk,
        riskLevel: getRiskLevelFn(risk),
      };
    });

    return zonesWithRisk
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 10);
  }, [grid, state]);

  // 위험 구역 클릭 시 해당 위치로 이동
  const handleZoneClick = useCallback((coordinates: Coordinates) => {
    if (mapInstance) {
      mapInstance.flyTo({
        center: coordinates,
        zoom: 13,
        duration: 1500,
      });
    }
    setSelectedLocation(coordinates);
  }, [mapInstance, setSelectedLocation]);

  // 리셋 핸들러
  const handleReset = useCallback(() => {
    setSelectedLocation(null);
  }, [setSelectedLocation]);

  // 리포트 페이지로 이동
  const handleViewReport = useCallback(() => {
    const params = new URLSearchParams({
      mode: state.mode,
      greenReduction: String(state.greenReduction),
      imperviousIncrease: String(state.imperviousIncrease),
      shelterEnabled: String(state.shelterEnabled),
      floodDefenseEnabled: String(state.floodDefenseEnabled),
      beforeRisk: String(comparison?.before.risk ?? stats?.averageRisk ?? 0.3),
      afterRisk: String(comparison?.after.risk ?? stats?.averageRisk ?? 0.5),
      location: selectedCell?.id ?? '경기도 전체',
    });
    router.push(`/report?${params.toString()}`);
  }, [state, comparison, stats, selectedCell, router]);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col lg:flex-row">
      {/* 지도 영역 */}
      <div className="relative h-[50vh] flex-1 lg:h-full">
        <MapViewer
          selectedLocation={selectedLocation}
          onMapLoad={handleMapLoad}
          onMapClick={handleMapClick}
        />

        {/* 도시 선택 드롭다운 */}
        <div className="absolute left-4 top-4 z-10">
          <CitySelector onSelect={handleCitySelect} />
        </div>

        {/* 레이어 토글 버튼 */}
        <div className="absolute right-4 top-4 z-10">
          <button
            type="button"
            onClick={() => setShowRiskLayer(!showRiskLayer)}
            className={`map-overlay px-3 py-2 text-sm font-medium transition-colors ${
              showRiskLayer
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {showRiskLayer ? '🗺️ 레이어 ON' : '🗺️ 레이어 OFF'}
          </button>
        </div>

        {/* 선택된 위치 정보 */}
        {selectedLocation && (
          <div className="absolute bottom-4 left-4 z-10">
            <LocationInfo
              coordinates={selectedLocation}
              cellInfo={cellInfo}
              onClose={() => setSelectedLocation(null)}
            />
          </div>
        )}

        {/* 위험도 범례 */}
        <div className="absolute bottom-4 right-4 z-10">
          <RiskLegend mode={state.mode} />
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <aside className="flex h-[50vh] w-full flex-col overflow-hidden border-t border-gray-200 bg-white transition-theme dark:border-gray-700 dark:bg-gray-800 lg:h-full lg:w-96 lg:border-l lg:border-t-0">
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 lg:p-6">
          <SimulationPanel
            state={state}
            result={afterResult}
            onStateChange={setState}
            onSimulate={handleSimulate}
            onReset={handleReset}
            isLoading={isLoading}
            hasLocation={!!selectedLocation}
          />

          {/* Before/After 비교 */}
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              전/후 비교
            </h3>
            <ComparisonPanel comparison={comparison} mode={state.mode} />
          </div>

          {/* 통계 요약 */}
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              지역 통계
            </h3>
            <StatsSummary stats={stats} mode={state.mode} />
          </div>

          {/* 위험 구역 TOP 3 */}
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <TopRiskZones
              zones={topRiskZones}
              mode={state.mode}
              onZoneClick={handleZoneClick}
            />
          </div>

          {/* 리포트 생성 버튼 */}
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <button
              type="button"
              onClick={handleViewReport}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-center font-medium text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                리포트 생성
              </span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function SimulatorClient() {
  return (
    <MapProvider>
      <SimulationProvider>
        <SimulatorContent />
      </SimulationProvider>
    </MapProvider>
  );
}
