/**
 * 시뮬레이션 데모를 위한 샘플 데이터 생성
 */

import type { Coordinates } from '../../types/map';
import type { HeatRiskParams, FloodRiskParams } from '../../types/simulation';

// 경기도 경계 범위
const GYEONGGI_BOUNDS = {
  minLng: 126.3,
  maxLng: 127.9,
  minLat: 36.9,
  maxLat: 38.3,
};

// 그리드 셀 크기 (도 단위)
const GRID_SIZE = 0.05;

export interface GridCell {
  id: string;
  center: Coordinates;
  bounds: {
    sw: Coordinates;
    ne: Coordinates;
  };
  heatParams: HeatRiskParams;
  floodParams: FloodRiskParams;
  // API 데이터의 원본 geometry (있으면 사용)
  originalGeometry?: GeoJSON.Geometry;
}

/**
 * 시드 기반 의사 난수 생성기
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * 경기도 그리드 데이터 생성
 */
export function generateGyeonggiGrid(): GridCell[] {
  const grid: GridCell[] = [];
  const random = seededRandom(42); // 고정 시드로 일관된 결과

  for (let lng = GYEONGGI_BOUNDS.minLng; lng < GYEONGGI_BOUNDS.maxLng; lng += GRID_SIZE) {
    for (let lat = GYEONGGI_BOUNDS.minLat; lat < GYEONGGI_BOUNDS.maxLat; lat += GRID_SIZE) {
      const centerLng = lng + GRID_SIZE / 2;
      const centerLat = lat + GRID_SIZE / 2;

      // 도시 중심부(수원, 성남 등)에 가까울수록 불투수면 높음
      const distanceFromCenter = Math.sqrt(
        Math.pow(centerLng - 127.0, 2) + Math.pow(centerLat - 37.4, 2)
      );
      const urbanFactor = Math.max(0, 1 - distanceFromCenter / 0.8);

      // 파라미터 생성 (위치 기반 + 랜덤 변동)
      const heatIndex = 0.3 + urbanFactor * 0.4 + random() * 0.2;
      const impervious = 0.2 + urbanFactor * 0.5 + random() * 0.15;
      const green = Math.max(0.1, 0.6 - urbanFactor * 0.4 + random() * 0.1);
      const rainRisk = 0.3 + random() * 0.4;
      const floodTrace = random() * 0.3 + (centerLat < 37.3 ? 0.2 : 0);
      const riverProximity = random() * 0.3;

      grid.push({
        id: `cell-${lng.toFixed(3)}-${lat.toFixed(3)}`,
        center: [centerLng, centerLat],
        bounds: {
          sw: [lng, lat],
          ne: [lng + GRID_SIZE, lat + GRID_SIZE],
        },
        heatParams: {
          heatIndex: Math.min(1, heatIndex),
          impervious: Math.min(1, impervious),
          green: Math.min(1, green),
        },
        floodParams: {
          rainRisk: Math.min(1, rainRisk),
          floodTrace: Math.min(1, floodTrace),
          impervious: Math.min(1, impervious),
          riverProximity: Math.min(1, riverProximity),
        },
      });
    }
  }

  return grid;
}

/**
 * 특정 좌표에 가장 가까운 그리드 셀 찾기
 */
export function findNearestCell(grid: GridCell[], coordinates: Coordinates): GridCell | null {
  if (grid.length === 0) return null;

  let nearest = grid[0];
  let minDistance = Infinity;

  for (const cell of grid) {
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
}

/**
 * GeoJSON FeatureCollection 생성 (지도 레이어용)
 * 항상 그리드 셀 bounds 기반 폴리곤 사용 (겹침 방지, 깔끔한 표시)
 */
export function createRiskGeoJSON(
  grid: GridCell[],
  riskCalculator: (cell: GridCell) => number
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: grid.map((cell) => {
      // 항상 bounds 기반 Polygon 생성 (그리드 형태로 깔끔하게 표시)
      const geometry: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          cell.bounds.sw,
          [cell.bounds.ne[0], cell.bounds.sw[1]],
          cell.bounds.ne,
          [cell.bounds.sw[0], cell.bounds.ne[1]],
          cell.bounds.sw,
        ]],
      };

      return {
        type: 'Feature' as const,
        id: cell.id,
        properties: {
          risk: riskCalculator(cell),
          center: cell.center,
        },
        geometry,
      };
    }),
  };
}
