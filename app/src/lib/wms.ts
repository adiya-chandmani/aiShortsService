/**
 * 경기기후플랫폼 WMS API 설정
 *
 * WMS (Web Map Service) 연동을 위한 설정 및 유틸리티
 *
 * 레이어 이름 참고:
 * - 기후지도 포털에서 실제 레이어 이름 확인 필요
 * - https://climate.gg.go.kr/gcs/cmm/selectMainMap.do
 * - 레이어 형식: spggcee:{레이어명}
 */

import type { SimulationMode } from '../types/simulation';

// 환경 변수에서 API 키 가져오기
const CLIMATE_API_KEY = process.env.NEXT_PUBLIC_CLIMATE_API_KEY || process.env.CLIMATE_API_KEY;

// WMS 기본 URL
const WMS_BASE_URL = 'https://climate.gg.go.kr/ols/api/geoserver/wms';

/**
 * WMS 레이어 설정
 *
 * NOTE: 실제 레이어 이름은 경기기후플랫폼 API 문서에서 확인 필요
 * 현재는 예상되는 레이어 이름을 사용하며, 필요시 환경 변수로 오버라이드 가능
 */
export const WMS_LAYERS = {
  heat: {
    // 폭염 관련 레이어
    riskMap: process.env.NEXT_PUBLIC_WMS_LAYER_HEAT_RISK || 'spggcee:heat_risk',
    thermalComfort: process.env.NEXT_PUBLIC_WMS_LAYER_THERMAL || 'spggcee:thermal_comfort',
    utci: process.env.NEXT_PUBLIC_WMS_LAYER_UTCI || 'spggcee:utci',
  },
  flood: {
    // 침수 관련 레이어
    riskMap: process.env.NEXT_PUBLIC_WMS_LAYER_FLOOD_RISK || 'spggcee:flood_risk',
    floodTrace: process.env.NEXT_PUBLIC_WMS_LAYER_FLOOD_TRACE || 'spggcee:flood_trace',
    extremeRain: process.env.NEXT_PUBLIC_WMS_LAYER_EXTREME_RAIN || 'spggcee:extreme_rain',
  },
  infrastructure: {
    // 인프라 레이어
    greenSpace: process.env.NEXT_PUBLIC_WMS_LAYER_GREEN || 'spggcee:green_space',
    shelter: process.env.NEXT_PUBLIC_WMS_LAYER_SHELTER || 'spggcee:shelter',
    floodDefense: process.env.NEXT_PUBLIC_WMS_LAYER_FLOOD_DEFENSE || 'spggcee:flood_defense',
  },
} as const;

/**
 * WMS GetMap URL 생성
 */
export function buildWmsUrl(options: {
  layers: string | string[];
  bbox?: [number, number, number, number]; // [minX, minY, maxX, maxY]
  width?: number;
  height?: number;
  format?: string;
  transparent?: boolean;
  crs?: string;
}): string {
  const {
    layers,
    bbox,
    width = 256,
    height = 256,
    format = 'image/png',
    transparent = true,
    crs = 'EPSG:3857',
  } = options;

  const layerString = Array.isArray(layers) ? layers.join(',') : layers;

  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: format,
    TRANSPARENT: transparent.toString(),
    LAYERS: layerString,
    CRS: crs,
    WIDTH: width.toString(),
    HEIGHT: height.toString(),
    STYLES: '',
    TILED: 'true',
  });

  if (CLIMATE_API_KEY) {
    params.set('apiKey', CLIMATE_API_KEY);
  }

  if (bbox) {
    params.set('BBOX', bbox.join(','));
  }

  return `${WMS_BASE_URL}?${params.toString()}`;
}

/**
 * MapLibre용 WMS 타일 URL 템플릿 생성
 *
 * MapLibre는 {bbox-epsg-3857} 플레이스홀더를 지원
 */
export function buildWmsTileUrl(layers: string | string[]): string {
  const layerString = Array.isArray(layers) ? layers.join(',') : layers;

  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    LAYERS: layerString,
    CRS: 'EPSG:3857',
    WIDTH: '256',
    HEIGHT: '256',
    STYLES: '',
  });

  if (CLIMATE_API_KEY) {
    params.set('apiKey', CLIMATE_API_KEY);
  }

  // MapLibre 타일 URL 템플릿
  return `${WMS_BASE_URL}?${params.toString()}&BBOX={bbox-epsg-3857}`;
}

/**
 * 모드에 따른 주요 WMS 레이어 가져오기
 */
export function getLayerForMode(mode: SimulationMode): string {
  return mode === 'heat' ? WMS_LAYERS.heat.riskMap : WMS_LAYERS.flood.riskMap;
}

/**
 * 모드에 따른 모든 WMS 레이어 가져오기
 */
export function getAllLayersForMode(mode: SimulationMode): string[] {
  const layers = mode === 'heat' ? WMS_LAYERS.heat : WMS_LAYERS.flood;
  return Object.values(layers);
}

/**
 * WMS 레이어 소스 ID 생성
 */
export function getWmsSourceId(mode: SimulationMode): string {
  return `climate-wms-${mode}`;
}

/**
 * WMS 레이어 ID 생성
 */
export function getWmsLayerId(mode: SimulationMode): string {
  return `climate-layer-${mode}`;
}

/**
 * API 키 존재 여부 확인
 */
export function hasApiKey(): boolean {
  return Boolean(CLIMATE_API_KEY);
}

/**
 * WMS 설정 정보 (디버깅용)
 */
export function getWmsConfig() {
  return {
    baseUrl: WMS_BASE_URL,
    hasApiKey: hasApiKey(),
    layers: WMS_LAYERS,
  };
}
