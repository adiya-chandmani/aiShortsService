/**
 * 기후 데이터 훅
 *
 * 경기기후플랫폼 API에서 실제 데이터를 가져와 사용합니다.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchHeatRiskData,
  fetchFloodTraceData,
  GYEONGGI_BBOX,
  getFeatureCentroid,
  findNearestFeature,
  extractRiskFromProperties,
  getApiStatus,
  type ClimateFeature,
  type ClimateFeatureCollection,
} from '../lib/api/climateApi';
import type { Coordinates } from '../types/map';
import type { SimulationMode, HeatRiskParams, FloodRiskParams } from '../types/simulation';

export interface ClimateDataCell {
  id: string;
  center: Coordinates;
  bounds: {
    sw: Coordinates;
    ne: Coordinates;
  };
  heatParams: HeatRiskParams;
  floodParams: FloodRiskParams;
  rawProperties: Record<string, unknown>;
  originalGeometry?: GeoJSON.Geometry;
}

interface UseClimateDataResult {
  data: ClimateDataCell[];
  isLoading: boolean;
  error: string | null;
  hasApiKey: boolean;
  refetch: () => Promise<void>;
  findNearestCell: (coordinates: Coordinates) => ClimateDataCell | null;
}

/**
 * 피처를 셀 데이터로 변환
 *
 * 실제 API 속성 사용:
 * - biotop_area: 비오톱 면적 (녹지/수역 규모)
 * - lclsf_cd: 대분류 코드 (G=농업, H=조성녹지, D=호소 등)
 * - mclsf_cd: 중분류 코드
 */
function featureToCell(feature: ClimateFeature, index: number, mode: 'heat' | 'flood' = 'heat'): ClimateDataCell | null {
  const centroid = getFeatureCentroid(feature);
  if (!centroid) {
    console.warn(`[Cell] No centroid for feature ${index}:`, feature.geometry?.type);
    return null;
  }

  const properties = feature.properties;

  // 바운드 계산 (셀 크기) - 샘플 데이터와 동일한 크기 사용
  const offset = 0.025; // 그리드 셀 반경 (GRID_SIZE/2 = 0.05/2)
  const bounds = {
    sw: [centroid[0] - offset, centroid[1] - offset] as Coordinates,
    ne: [centroid[0] + offset, centroid[1] + offset] as Coordinates,
  };

  // 실제 API 속성 추출
  const biotopArea = typeof properties.biotop_area === 'number' ? properties.biotop_area : 0;
  const lclsfCd = (properties.lclsf_cd as string) || '';
  const mclsfCd = (properties.mclsf_cd as string) || '';

  // 디버그: 첫 5개 피처 로깅
  if (index < 5) {
    console.log(`[Cell ${index}]`, {
      id: feature.id,
      biotopArea,
      lclsfCd,
      mclsfCd,
      center: centroid,
      mode,
    });
  }

  // 위치 기반 도시화 정도 추정 (경기도 중심 = 수원 근처)
  const distFromCenter = Math.sqrt(
    Math.pow(centroid[0] - 127.0, 2) + Math.pow(centroid[1] - 37.27, 2)
  );
  const urbanFactor = Math.max(0, 1 - distFromCenter / 1.0);

  // 원본 geometry 저장
  const originalGeometry = feature.geometry as GeoJSON.Geometry;

  // biotop_area를 정규화 (0~1 범위로)
  // 일반적으로 0~100 범위이므로 log 스케일 사용
  const normalizedArea = Math.min(1, Math.log10(biotopArea + 1) / 2);

  if (mode === 'heat') {
    // 공원 = 녹지 = 폭염 완화 구역
    // 실제 API 데이터 기반 계산

    // 녹지 비율: biotop_area가 클수록 녹지 높음
    const green = 0.4 + normalizedArea * 0.5;

    // 불투수면: 녹지가 많으면 불투수면 낮음
    // 대분류 코드에 따라 조정 (H=조성녹지는 일부 포장)
    const imperviousBase = lclsfCd === 'H' ? 0.25 : 0.15;
    const impervious = imperviousBase + (1 - normalizedArea) * 0.2;

    // 폭염 지수: 도시화 정도 + 녹지 규모 반영
    // 녹지가 크면 폭염 위험 낮음
    const heatIndex = 0.3 + urbanFactor * 0.4 - normalizedArea * 0.2;

    return {
      id: feature.id || `park-${index}`,
      center: centroid,
      bounds,
      heatParams: {
        heatIndex: Math.max(0.1, Math.min(1, heatIndex)),
        impervious: Math.max(0.05, Math.min(1, impervious)),
        green: Math.max(0.2, Math.min(1, green)),
      },
      floodParams: {
        rainRisk: 0.3,
        floodTrace: 0.1,
        impervious: Math.max(0.05, Math.min(1, impervious)),
        riverProximity: 0.2,
      },
      rawProperties: properties,
      originalGeometry,
    };
  } else {
    // 하천 = 침수 위험 구역
    // 실제 API 데이터 기반 계산

    // 하천 인접성: biotop_area(수역 면적)가 클수록 높음
    const riverProximity = 0.5 + normalizedArea * 0.4;

    // 침수 흔적: 수역 면적이 크면 침수 가능성 높음
    // 대분류 코드에 따라 조정 (D=호소, C=하천)
    const floodTraceBase = lclsfCd === 'D' ? 0.5 : lclsfCd === 'C' ? 0.6 : 0.4;
    const floodTrace = floodTraceBase + normalizedArea * 0.3;

    // 강우 위험: 도시화 + 수역 규모 반영
    const rainRisk = 0.35 + urbanFactor * 0.3 + normalizedArea * 0.15;

    return {
      id: feature.id || `river-${index}`,
      center: centroid,
      bounds,
      heatParams: {
        heatIndex: 0.4,
        impervious: 0.3,
        green: 0.5,
      },
      floodParams: {
        rainRisk: Math.max(0.2, Math.min(1, rainRisk)),
        floodTrace: Math.max(0.2, Math.min(1, floodTrace)),
        impervious: 0.3 + urbanFactor * 0.2,
        riverProximity: Math.max(0.3, Math.min(1, riverProximity)),
      },
      rawProperties: properties,
      originalGeometry,
    };
  }
}

/**
 * 속성에서 숫자값 추출
 */
function extractNumericProperty(
  properties: Record<string, unknown>,
  keys: string[],
  defaultValue: number
): number {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === 'number') {
      // 정규화
      if (value <= 1) return value;
      if (value <= 100) return value / 100;
      return Math.min(1, value / 1000);
    }
  }
  return defaultValue;
}

/**
 * 기후 데이터 훅
 */
export function useClimateData(mode: SimulationMode = 'heat'): UseClimateDataResult {
  const [data, setData] = useState<ClimateDataCell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { hasApiKey } = getApiStatus();

  const fetchData = useCallback(async () => {
    if (!hasApiKey) {
      console.log('No API key, using sample data');
      setError('API 키가 설정되지 않았습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 모드에 따라 데이터 가져오기 (더 많은 데이터로 경기도 전체 커버)
      let featureCollection: ClimateFeatureCollection;

      if (mode === 'heat') {
        featureCollection = await fetchHeatRiskData(GYEONGGI_BBOX, 15000);
      } else {
        featureCollection = await fetchFloodTraceData(GYEONGGI_BBOX, 15000);
      }

      // 피처가 없으면 에러
      if (!featureCollection.features || featureCollection.features.length === 0) {
        throw new Error('API에서 데이터를 찾을 수 없습니다.');
      }

      // 피처를 셀로 변환 (mode에 따라 다르게 파싱)
      const cells = featureCollection.features
        .map((feature, index) => featureToCell(feature, index, mode))
        .filter((cell): cell is ClimateDataCell => cell !== null);

      if (cells.length === 0) {
        throw new Error('유효한 데이터가 없습니다.');
      }

      console.log(`Loaded ${cells.length} cells from API for ${mode} mode`);
      setData(cells);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch climate data:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : '기후 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
      // 에러 시 빈 배열 설정 (SimulatorClient에서 샘플 데이터로 폴백)
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [mode, hasApiKey]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 가장 가까운 셀 찾기
  const findNearestCell = useCallback(
    (coordinates: Coordinates): ClimateDataCell | null => {
      if (data.length === 0) return null;

      let nearest = data[0];
      let minDistance = Infinity;

      for (const cell of data) {
        const distance = Math.sqrt(
          Math.pow(cell.center[0] - coordinates[0], 2) +
          Math.pow(cell.center[1] - coordinates[1], 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = cell;
        }
      }

      return nearest;
    },
    [data]
  );

  return {
    data,
    isLoading,
    error,
    hasApiKey,
    refetch: fetchData,
    findNearestCell,
  };
}

/**
 * 병합된 기후 데이터 훅 (폭염 + 침수)
 */
export function useCombinedClimateData(): UseClimateDataResult & {
  heatData: ClimateDataCell[];
  floodData: ClimateDataCell[];
} {
  const [heatData, setHeatData] = useState<ClimateDataCell[]>([]);
  const [floodData, setFloodData] = useState<ClimateDataCell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { hasApiKey } = getApiStatus();

  const fetchData = useCallback(async () => {
    if (!hasApiKey) {
      setError('API 키가 설정되지 않았습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 병렬로 데이터 가져오기
      const [heatCollection, floodCollection] = await Promise.all([
        fetchHeatRiskData(GYEONGGI_BBOX, 1000),
        fetchFloodTraceData(GYEONGGI_BBOX, 1000),
      ]);

      const heatCells = heatCollection.features
        .map((feature, index) => featureToCell(feature, index))
        .filter((cell): cell is ClimateDataCell => cell !== null);

      const floodCells = floodCollection.features
        .map((feature, index) => featureToCell(feature, index))
        .filter((cell): cell is ClimateDataCell => cell !== null);

      setHeatData(heatCells);
      setFloodData(floodCells);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch climate data:', err);
      setError(
        err instanceof Error
          ? err.message
          : '기후 데이터를 불러오는데 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [hasApiKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 가장 가까운 셀 찾기 (병합된 데이터에서)
  const findNearestCell = useCallback(
    (coordinates: Coordinates): ClimateDataCell | null => {
      const allData = [...heatData, ...floodData];
      if (allData.length === 0) return null;

      let nearest = allData[0];
      let minDistance = Infinity;

      for (const cell of allData) {
        const distance = Math.sqrt(
          Math.pow(cell.center[0] - coordinates[0], 2) +
          Math.pow(cell.center[1] - coordinates[1], 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = cell;
        }
      }

      return nearest;
    },
    [heatData, floodData]
  );

  return {
    data: [...heatData, ...floodData],
    heatData,
    floodData,
    isLoading,
    error,
    hasApiKey,
    refetch: fetchData,
    findNearestCell,
  };
}
