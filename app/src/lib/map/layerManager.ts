/**
 * 지도 레이어 관리 유틸리티
 */

import type { Map } from 'maplibre-gl';
import type { SimulationMode } from '../../types/simulation';

const RISK_SOURCE_ID = 'risk-source';
const RISK_FILL_LAYER_ID = 'risk-fill-layer';
const RISK_LINE_LAYER_ID = 'risk-line-layer';

// 폭염 위험도 색상 (녹색 → 노란색 → 주황색 → 빨간색) - 더 직관적인 색상
const HEAT_COLORS: [number, string][] = [
  [0, '#10b981'],    // 낮음 - 녹색 (안전)
  [0.3, '#84cc16'],  // 양호 - 연두색
  [0.5, '#fbbf24'],  // 주의 - 노란색
  [0.7, '#f97316'],  // 경고 - 주황색
  [0.85, '#ef4444'], // 위험 - 빨간색
  [1, '#991b1b'],    // 매우위험 - 진빨간색
];

// 침수 위험도 색상 (하늘색 → 파란색 → 남색 → 보라색)
const FLOOD_COLORS: [number, string][] = [
  [0, '#a5f3fc'],    // 낮음 - 연하늘색
  [0.3, '#22d3ee'],  // 양호 - 하늘색
  [0.5, '#0ea5e9'],  // 주의 - 파란색
  [0.7, '#2563eb'],  // 경고 - 진파란색
  [0.85, '#4f46e5'], // 위험 - 남보라색
  [1, '#4c1d95'],    // 매우위험 - 진보라색
];

/**
 * 위험도 레이어 추가 또는 업데이트
 * Polygon은 fill 레이어로, LineString은 line 레이어로 렌더링
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
    ['coalesce', ['get', 'risk'], 0.5], // risk가 없으면 0.5 기본값
    ...colors.flat(),
  ];

  // 디버그: 데이터 확인
  console.log(`[LayerManager] Mode: ${mode}, Features: ${geojson.features.length}`);
  if (geojson.features.length > 0) {
    const types = geojson.features.slice(0, 5).map(f => ({
      type: f.geometry?.type,
      risk: f.properties?.risk,
    }));
    console.log('[LayerManager] Sample features:', types);
  }

  // 소스가 이미 존재하면 데이터만 업데이트
  const existingSource = map.getSource(RISK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

  if (existingSource) {
    existingSource.setData(geojson);

    // Fill 레이어 색상 업데이트
    if (map.getLayer(RISK_FILL_LAYER_ID)) {
      map.setPaintProperty(RISK_FILL_LAYER_ID, 'fill-color', colorExpression);
    }
    // Line 레이어 색상 업데이트
    if (map.getLayer(RISK_LINE_LAYER_ID)) {
      map.setPaintProperty(RISK_LINE_LAYER_ID, 'line-color', colorExpression);
    }
  } else {
    // 새 소스 추가
    map.addSource(RISK_SOURCE_ID, {
      type: 'geojson',
      data: geojson,
    });

    // Fill 레이어 (Polygon, MultiPolygon용)
    map.addLayer({
      id: RISK_FILL_LAYER_ID,
      type: 'fill',
      source: RISK_SOURCE_ID,
      filter: ['any',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['geometry-type'], 'MultiPolygon'],
      ],
      paint: {
        'fill-color': colorExpression,
        'fill-opacity': 0.7,  // 투명도 증가 (더 선명하게)
        'fill-outline-color': 'rgba(255, 255, 255, 0.5)',  // 흰색 외곽선 (구분 명확)
      },
    });

    // Line 레이어 (LineString, MultiLineString용) - 하천 등
    map.addLayer({
      id: RISK_LINE_LAYER_ID,
      type: 'line',
      source: RISK_SOURCE_ID,
      filter: ['any',
        ['==', ['geometry-type'], 'LineString'],
        ['==', ['geometry-type'], 'MultiLineString'],
      ],
      paint: {
        'line-color': colorExpression,
        'line-width': 5,
        'line-opacity': 0.85,
      },
    });
  }
}

/**
 * 위험도 레이어 제거
 */
export function removeRiskLayer(map: Map): void {
  if (map.getLayer(RISK_FILL_LAYER_ID)) {
    map.removeLayer(RISK_FILL_LAYER_ID);
  }
  if (map.getLayer(RISK_LINE_LAYER_ID)) {
    map.removeLayer(RISK_LINE_LAYER_ID);
  }
  if (map.getSource(RISK_SOURCE_ID)) {
    map.removeSource(RISK_SOURCE_ID);
  }
}

/**
 * 위험도 레이어 투명도 설정
 */
export function setRiskLayerOpacity(map: Map, opacity: number): void {
  if (map.getLayer(RISK_FILL_LAYER_ID)) {
    map.setPaintProperty(RISK_FILL_LAYER_ID, 'fill-opacity', opacity);
  }
  if (map.getLayer(RISK_LINE_LAYER_ID)) {
    map.setPaintProperty(RISK_LINE_LAYER_ID, 'line-opacity', opacity);
  }
}

/**
 * 위험도 레이어 표시/숨김
 */
export function setRiskLayerVisibility(map: Map, visible: boolean): void {
  if (map.getLayer(RISK_FILL_LAYER_ID)) {
    map.setLayoutProperty(RISK_FILL_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }
  if (map.getLayer(RISK_LINE_LAYER_ID)) {
    map.setLayoutProperty(RISK_LINE_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
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
