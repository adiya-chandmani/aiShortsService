/**
 * 지도 레이어 관리 유틸리티
 */

import type { Map } from 'maplibre-gl';
import type { SimulationMode } from '@/types/simulation';

const RISK_LAYER_ID = 'risk-layer';
const RISK_SOURCE_ID = 'risk-source';

// 폭염 위험도 색상 (파란색 → 녹색 → 주황색 → 빨간색)
const HEAT_COLORS: [number, string][] = [
  [0, '#3b82f6'],    // 낮음 - 파란색
  [0.25, '#22c55e'], // 안전 - 녹색
  [0.5, '#f59e0b'],  // 주의 - 주황색
  [0.75, '#ef4444'], // 높음 - 빨간색
  [1, '#7c2d12'],    // 위험 - 진빨간색
];

// 침수 위험도 색상 (하늘색 → 파란색 → 남색)
const FLOOD_COLORS: [number, string][] = [
  [0, '#93c5fd'],    // 낮음 - 연파란색
  [0.25, '#3b82f6'], // 안전 - 파란색
  [0.5, '#06b6d4'],  // 주의 - 청록색
  [0.75, '#2563eb'], // 높음 - 진파란색
  [1, '#1e3a8a'],    // 위험 - 남색
];

/**
 * 위험도 레이어 추가 또는 업데이트
 */
export function updateRiskLayer(
  map: Map,
  geojson: GeoJSON.FeatureCollection,
  mode: SimulationMode
): void {
  const colors = mode === 'heat' ? HEAT_COLORS : FLOOD_COLORS;

  // 색상 표현식 생성
  const colorExpression: maplibregl.ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['get', 'risk'],
    ...colors.flat(),
  ];

  // 소스가 이미 존재하면 데이터만 업데이트
  const existingSource = map.getSource(RISK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

  if (existingSource) {
    existingSource.setData(geojson);

    // 레이어 색상 업데이트
    if (map.getLayer(RISK_LAYER_ID)) {
      map.setPaintProperty(RISK_LAYER_ID, 'fill-color', colorExpression);
    }
  } else {
    // 새 소스 추가
    map.addSource(RISK_SOURCE_ID, {
      type: 'geojson',
      data: geojson,
    });

    // 새 레이어 추가
    map.addLayer({
      id: RISK_LAYER_ID,
      type: 'fill',
      source: RISK_SOURCE_ID,
      paint: {
        'fill-color': colorExpression,
        'fill-opacity': 0.6,
        'fill-outline-color': 'rgba(0, 0, 0, 0.1)',
      },
    });
  }
}

/**
 * 위험도 레이어 제거
 */
export function removeRiskLayer(map: Map): void {
  if (map.getLayer(RISK_LAYER_ID)) {
    map.removeLayer(RISK_LAYER_ID);
  }
  if (map.getSource(RISK_SOURCE_ID)) {
    map.removeSource(RISK_SOURCE_ID);
  }
}

/**
 * 위험도 레이어 투명도 설정
 */
export function setRiskLayerOpacity(map: Map, opacity: number): void {
  if (map.getLayer(RISK_LAYER_ID)) {
    map.setPaintProperty(RISK_LAYER_ID, 'fill-opacity', opacity);
  }
}

/**
 * 위험도 레이어 표시/숨김
 */
export function setRiskLayerVisibility(map: Map, visible: boolean): void {
  if (map.getLayer(RISK_LAYER_ID)) {
    map.setLayoutProperty(RISK_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }
}

/**
 * 하이라이트 레이어 (선택된 셀)
 */
const HIGHLIGHT_LAYER_ID = 'highlight-layer';
const HIGHLIGHT_SOURCE_ID = 'highlight-source';

export function highlightCell(map: Map, cellId: string | null): void {
  if (!map.getSource(RISK_SOURCE_ID)) return;

  // 기존 하이라이트 제거
  if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
    map.removeLayer(HIGHLIGHT_LAYER_ID);
  }
  if (map.getSource(HIGHLIGHT_SOURCE_ID)) {
    map.removeSource(HIGHLIGHT_SOURCE_ID);
  }

  if (!cellId) return;

  // 선택된 셀 필터링
  map.addLayer({
    id: HIGHLIGHT_LAYER_ID,
    type: 'line',
    source: RISK_SOURCE_ID,
    paint: {
      'line-color': '#ffffff',
      'line-width': 3,
    },
    filter: ['==', ['id'], cellId],
  });
}
