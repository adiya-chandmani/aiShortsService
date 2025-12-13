'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapViewer, RiskLegend } from '../map';
import {
  SimulationPanel,
  ComparisonPanel,
  StatsSummary,
  TopRiskZones,
  type RiskZoneData,
} from '../simulation';
import { MapProvider, useMapContext } from '../../contexts/MapContext';
import { SimulationProvider, useSimulationContext } from '../../contexts/SimulationContext';
import { CitySelector } from './CitySelector';
import { LocationInfo } from './LocationInfo';
import {
  generateGyeonggiGrid,
  findNearestCell as findNearestSampleCell,
  createRiskGeoJSON,
  type GridCell,
} from '../../lib/data/sampleData';
import { useClimateData, type ClimateDataCell } from '../../hooks/useClimateData';
import { updateRiskLayer, removeRiskLayer } from '../../lib/map/layerManager';
import { calculateHeatRisk, getRiskLevel } from '../../lib/simulation/heatRisk';
import { calculateFloodRisk, getRiskLevel as getFloodRiskLevel } from '../../lib/simulation/floodRisk';
import type { Coordinates } from '../../types/map';
import type { Map } from 'maplibre-gl';

function SimulatorContent() {
  const router = useRouter();
  const { setMap, setSelectedLocation, selectedLocation } = useMapContext();
  const { state, setState, afterResult, comparison, isLoading, runSimulation } = useSimulationContext();
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [showRiskLayer, setShowRiskLayer] = useState(true);
  const [dataSource, setDataSource] = useState<'api' | 'sample'>('api');

  // 실제 API 데이터 가져오기
  const {
    data: apiData,
    isLoading: isApiLoading,
    error: apiError,
    hasApiKey,
  } = useClimateData(state.mode);

  // API 데이터가 있는 곳만 그리드로 표시 (겹침 방지, 샘플 데이터 없음)
  useEffect(() => {
    if (apiData.length > 0 && !apiError) {
      // 그리드 셀 크기
      const GRID_SIZE = 0.05;

      // 서울 중심부 제외 (경기도만 표시)
      // 서울: 대략 경도 126.8~127.2, 위도 37.45~37.7
      const isInSeoul = (lng: number, lat: number) => {
        return lng >= 126.8 && lng <= 127.1 && lat >= 37.48 && lat <= 37.68;
      };

      // 그리드 기반으로 클러스터링 (겹침 방지)
      const gridMap: Record<string, GridCell> = {};

      for (const apiCell of apiData) {
        const [lng, lat] = apiCell.center;

        // 서울 제외
        if (isInSeoul(lng, lat)) continue;

        // 그리드 키 생성 (같은 그리드 셀에 속하는 데이터는 하나만 유지)
        const gridKey = `${Math.floor(lng / GRID_SIZE)}_${Math.floor(lat / GRID_SIZE)}`;

        // 이미 있으면 스킵 (중복 방지)
        if (gridMap[gridKey]) continue;

        // 그리드 셀 중심 계산
        const cellCenterLng = Math.floor(lng / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const cellCenterLat = Math.floor(lat / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

        gridMap[gridKey] = {
          id: gridKey,
          center: [cellCenterLng, cellCenterLat],
          bounds: {
            sw: [cellCenterLng - GRID_SIZE / 2, cellCenterLat - GRID_SIZE / 2],
            ne: [cellCenterLng + GRID_SIZE / 2, cellCenterLat + GRID_SIZE / 2],
          },
          heatParams: apiCell.heatParams,
          floodParams: apiCell.floodParams,
        };
      }

      const apiGrid = Object.values(gridMap);
      console.log(`[Grid] API 기반 그리드 생성: ${apiGrid.length}개 셀`);
      setGrid(apiGrid);
      setDataSource('api');
    } else {
      // API 데이터 없으면 빈 그리드 (회색 샘플 데이터 표시 안함)
      setGrid([]);
      setDataSource(apiError ? 'sample' : 'api');
    }
  }, [apiData, apiError]);

  // 선택된 위치에 가장 가까운 셀 찾기
  useEffect(() => {
    if (selectedLocation && grid.length > 0) {
      const cell = findNearestSampleCell(grid, selectedLocation);
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
      let risk: number;
      try {
        if (state.mode === 'heat') {
          risk = calculateHeatRisk({
            heatIndex: cell.heatParams?.heatIndex ?? 0.5,
            impervious: cell.heatParams?.impervious ?? 0.5,
            green: cell.heatParams?.green ?? 0.3,
            greenReduction: state.greenReduction / 100,
            imperviousIncrease: state.imperviousIncrease / 100,
            shelterEnabled: state.shelterEnabled,
          });
        } else {
          risk = calculateFloodRisk({
            rainRisk: cell.floodParams?.rainRisk ?? 0.5,
            floodTrace: cell.floodParams?.floodTrace ?? 0.3,
            impervious: cell.floodParams?.impervious ?? 0.5,
            riverProximity: cell.floodParams?.riverProximity ?? 0.3,
            imperviousIncrease: state.imperviousIncrease / 100,
            floodDefenseEnabled: state.floodDefenseEnabled,
          });
        }
      } catch {
        risk = 0.5; // 기본값
      }
      // NaN 방지
      if (isNaN(risk) || risk === undefined) {
        risk = 0.5;
      }
      return risk;
    });

    // 디버그: GeoJSON 생성 결과
    console.log(`[GeoJSON] Mode: ${state.mode}, Features: ${geojson.features.length}`);
    if (geojson.features.length > 0) {
      const sample = geojson.features.slice(0, 3);
      console.log('[GeoJSON] Sample features:', sample.map(f => ({
        id: f.id,
        risk: f.properties?.risk,
        type: f.geometry?.type,
      })));
    }

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
          mode={state.mode}
          showWmsLayer={showRiskLayer}
        />

        {/* 도시 선택 드롭다운 */}
        <div className="absolute left-4 top-4 z-10">
          <CitySelector onSelect={handleCitySelect} />
        </div>

        {/* 레이어 토글 버튼 및 데이터 소스 표시 */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
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
          {/* 데이터 소스 표시 */}
          <div className={`map-overlay px-3 py-2 text-xs font-medium ${
            isApiLoading
              ? 'text-yellow-600 dark:text-yellow-400'
              : dataSource === 'api'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
          }`}>
            {isApiLoading ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                API 로딩중...
              </span>
            ) : dataSource === 'api' ? (
              <span>📡 실시간 API 데이터</span>
            ) : (
              <span>💾 샘플 데이터</span>
            )}
          </div>
          {apiError && (
            <div className="map-overlay max-w-48 px-3 py-2 text-xs text-red-600 dark:text-red-400" title={apiError}>
              ⚠️ {apiError.length > 30 ? apiError.substring(0, 30) + '...' : apiError}
            </div>
          )}
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
