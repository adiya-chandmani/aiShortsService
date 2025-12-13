/**
 * 경기기후플랫폼 API 클라이언트
 *
 * WFS (Web Feature Service)를 통해 실제 기후 데이터를 가져옵니다.
 */

import type { Coordinates } from '@/types/map';

// API 설정
const API_KEY = process.env.NEXT_PUBLIC_CLIMATE_API_KEY || '';
const WFS_BASE_URL = 'https://climate.gg.go.kr/ols/api/geoserver/wfs';

/**
 * WFS 지원 레이어 목록
 *
 * 폭염 관련:
 * - impvs: 투수·불투수
 * - park: 공원 현황도
 * - swtr_rstar: 무더위쉼터
 * - biotop_*: 비오톱 (생태계)
 *
 * 침수 관련:
 * - impvs: 투수·불투수
 * - river: 하천 현황도
 * - flod_weak_fclt: 극한호우 취약시설
 * - lsmd_cont_uj301_41: 소하천
 */
export const WFS_LAYERS = {
  // 공통
  impervious: 'spggcee:impvs',           // 투수·불투수
  park: 'spggcee:park',                   // 공원 현황도
  river: 'spggcee:river',                 // 하천 현황도

  // 폭염 관련
  heatShelter: 'spggcee:swtr_rstar',      // 무더위쉼터
  mobileWorkerShelter: 'spggcee:tm_mblwkr_rstar', // 이동노동자쉼터
  medicalFacility: 'spggcee:mdlcr_corp_prst',     // 의료시설

  // 침수 관련
  floodVulnerable: 'spggcee:flod_weak_fclt',      // 극한호우 취약시설
  smallRiver: 'spggcee:lsmd_cont_uj301_41',       // 소하천
  evacuationShelter: 'spggcee:dsvctm_tmpr_hab_fclt', // 이재민 임시거주시설

  // 생태계
  biotopLarge: 'spggcee:biotop_lclsf',    // 비오톱 대분류
  biotopMedium: 'spggcee:biotop_mclsf',   // 비오톱 중분류
  vegetation: 'spggcee:vgmap',            // 현존식생지도
} as const;

// 기본 데이터 레이어 (투수·불투수 - 가장 기본적인 공간 데이터)
export const LAYER_NAMES = {
  heatRisk: WFS_LAYERS.impervious,
  floodRisk: WFS_LAYERS.impervious,
} as const;

/**
 * GeoJSON Feature 타입
 */
export interface ClimateFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString' | 'MultiLineString';
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
}

export interface ClimateFeatureCollection {
  type: 'FeatureCollection';
  features: ClimateFeature[];
  totalFeatures?: number;
  numberMatched?: number;
  numberReturned?: number;
}

/**
 * 폭염 데이터 속성
 */
export interface HeatRiskProperties {
  risk_level?: number;
  heat_index?: number;
  impervious_ratio?: number;
  green_ratio?: number;
  utci?: number;
  area_name?: string;
  [key: string]: unknown;
}

/**
 * 침수 데이터 속성
 */
export interface FloodRiskProperties {
  risk_level?: number;
  flood_depth?: number;
  rain_intensity?: number;
  impervious_ratio?: number;
  area_name?: string;
  flood_date?: string;
  [key: string]: unknown;
}

/**
 * WFS GetFeature 요청 옵션
 */
interface WfsRequestOptions {
  typeName: string;
  bbox?: [number, number, number, number]; // [minX, minY, maxX, maxY]
  maxFeatures?: number;
  startIndex?: number;
  crs?: string;
  outputFormat?: string;
}

/**
 * WFS GetFeature URL 생성
 */
function buildWfsUrl(options: WfsRequestOptions): string {
  const {
    typeName,
    bbox,
    maxFeatures = 1000,
    startIndex = 0,
    crs = 'EPSG:4326',
    outputFormat = 'application/json',
  } = options;

  // 기본 파라미터 (사용자 제공 예시 기반)
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typeName,
    outputFormat,
    maxFeatures: maxFeatures.toString(),
    // 좌표계를 WGS84로 변환 요청 (MapLibre 호환)
    srsName: 'EPSG:4326',
  });

  if (API_KEY) {
    params.set('apiKey', API_KEY);
  }

  // BBOX는 선택적으로 추가
  if (bbox) {
    // 이 서버는 lon,lat 순서 사용: minLng,minLat,maxLng,maxLat
    params.set('bbox', `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]},${crs}`);
  }

  const url = `${WFS_BASE_URL}?${params.toString()}`;
  console.log('[WFS] Request URL:', url);
  return url;
}

/**
 * API 응답이 XML 에러인지 확인
 */
function isXmlError(text: string): boolean {
  return text.trim().startsWith('<?xml') || text.trim().startsWith('<');
}

/**
 * XML 에러에서 메시지 추출
 */
function extractXmlErrorMessage(xml: string): string {
  // 간단한 XML 에러 메시지 추출
  const match = xml.match(/<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/i)
    || xml.match(/<ows:ExceptionText>([\s\S]*?)<\/ows:ExceptionText>/i)
    || xml.match(/<Message>([\s\S]*?)<\/Message>/i);

  if (match) {
    return match[1].trim();
  }
  return 'API returned XML error response';
}

/**
 * WFS 데이터 가져오기
 */
async function fetchWfsData<T extends ClimateFeature>(
  options: WfsRequestOptions
): Promise<ClimateFeatureCollection & { features: T[] }> {
  const url = buildWfsUrl(options);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Next.js 캐시 설정 (5분)
      next: { revalidate: 300 },
    });

    // 응답 텍스트 먼저 확인
    const text = await response.text();

    // XML 에러 응답 확인
    if (isXmlError(text)) {
      const errorMessage = extractXmlErrorMessage(text);
      console.error('WFS returned XML error:', errorMessage);
      throw new Error(`WFS API 오류: ${errorMessage}`);
    }

    if (!response.ok) {
      throw new Error(`WFS request failed: ${response.status} ${response.statusText}`);
    }

    // JSON 파싱
    try {
      const data = JSON.parse(text);
      console.log('[WFS] Response:', {
        type: data.type,
        totalFeatures: data.totalFeatures,
        numberReturned: data.numberReturned,
        featuresCount: data.features?.length || 0,
      });
      return data as ClimateFeatureCollection & { features: T[] };
    } catch {
      console.error('Failed to parse WFS response as JSON:', text.substring(0, 500));
      throw new Error('WFS API 응답을 파싱할 수 없습니다.');
    }
  } catch (error) {
    console.error('WFS fetch error:', error);
    throw error;
  }
}

/**
 * 투수·불투수 데이터 가져오기 (기본 레이어)
 */
export async function fetchImperviousData(
  bbox?: [number, number, number, number],
  maxFeatures = 500
): Promise<ClimateFeatureCollection> {
  // BBOX 없이 먼저 시도 (일부 레이어는 BBOX 없이 더 잘 동작)
  return fetchWfsData({
    typeName: WFS_LAYERS.impervious,
    // bbox 제거 - 전체 데이터 가져오기
    maxFeatures,
  });
}

/**
 * 공원 데이터 가져오기 (녹지)
 */
export async function fetchParkData(
  bbox?: [number, number, number, number],
  maxFeatures = 15000  // 더 많은 데이터 가져오기 (총 35,288개 중)
): Promise<ClimateFeatureCollection> {
  return fetchWfsData({
    typeName: WFS_LAYERS.park,
    bbox,  // BBOX로 지역 필터링
    maxFeatures,
  });
}

/**
 * 무더위쉼터 데이터 가져오기
 */
export async function fetchHeatShelterData(
  bbox?: [number, number, number, number],
  maxFeatures = 500
): Promise<ClimateFeatureCollection> {
  return fetchWfsData({
    typeName: WFS_LAYERS.heatShelter,
    bbox,
    maxFeatures,
  });
}

/**
 * 하천 데이터 가져오기
 */
export async function fetchRiverData(
  bbox?: [number, number, number, number],
  maxFeatures = 15000  // 더 많은 데이터 가져오기 (총 158,502개 중)
): Promise<ClimateFeatureCollection> {
  return fetchWfsData({
    typeName: WFS_LAYERS.river,
    bbox,  // BBOX로 지역 필터링
    maxFeatures,
  });
}

/**
 * 극한호우 취약시설 데이터 가져오기
 */
export async function fetchFloodVulnerableData(
  bbox?: [number, number, number, number],
  maxFeatures = 500
): Promise<ClimateFeatureCollection> {
  return fetchWfsData({
    typeName: WFS_LAYERS.floodVulnerable,
    bbox,
    maxFeatures,
  });
}

/**
 * 경기도 구역별 BBOX (고르게 데이터 수집)
 */
const GYEONGGI_REGIONS: { name: string; bbox: [number, number, number, number] }[] = [
  // 서쪽 (인천, 김포, 부천)
  { name: 'west', bbox: [126.3, 37.3, 126.8, 37.8] },
  // 중앙 (수원, 성남, 용인)
  { name: 'center', bbox: [126.8, 37.0, 127.3, 37.6] },
  // 동쪽 (가평, 양평, 여주)
  { name: 'east', bbox: [127.3, 37.2, 127.9, 37.9] },
  // 북쪽 (파주, 연천, 포천)
  { name: 'north', bbox: [126.5, 37.7, 127.5, 38.3] },
  // 남서쪽 (평택, 화성, 오산)
  { name: 'southwest', bbox: [126.7, 36.9, 127.1, 37.3] },
  // 남동쪽 (안성, 이천, 여주 남부)
  { name: 'southeast', bbox: [127.0, 36.9, 127.5, 37.3] },
];

/**
 * 여러 구역에서 데이터를 가져와 병합
 */
async function fetchFromMultipleRegions(
  fetchFn: (bbox: [number, number, number, number], maxFeatures: number) => Promise<ClimateFeatureCollection>,
  maxFeaturesPerRegion: number
): Promise<ClimateFeatureCollection> {
  const results = await Promise.all(
    GYEONGGI_REGIONS.map(region =>
      fetchFn(region.bbox, maxFeaturesPerRegion).catch(err => {
        console.warn(`[WFS] ${region.name} 지역 데이터 가져오기 실패:`, err);
        return { type: 'FeatureCollection' as const, features: [] };
      })
    )
  );

  // 모든 결과 병합
  const allFeatures = results.flatMap(r => r.features || []);
  console.log(`[WFS] 총 ${allFeatures.length}개 피처 수집 (${GYEONGGI_REGIONS.length}개 구역)`);

  return {
    type: 'FeatureCollection',
    features: allFeatures,
    totalFeatures: allFeatures.length,
  };
}

/**
 * 폭염 관련 데이터 가져오기
 * 공원 데이터 사용 (녹지 = 폭염 완화)
 * 경기도 전역에서 고르게 수집
 */
export async function fetchHeatRiskData(
  bbox?: [number, number, number, number],
  maxFeatures = 15000
): Promise<ClimateFeatureCollection> {
  // 각 구역에서 3000개씩 = 최대 15000개
  return fetchFromMultipleRegions(fetchParkData, Math.ceil(maxFeatures / GYEONGGI_REGIONS.length));
}

/**
 * 침수 관련 데이터 가져오기
 * 하천 데이터 사용 (하천 인접 = 침수 위험)
 * 경기도 전역에서 고르게 수집
 */
export async function fetchFloodTraceData(
  bbox?: [number, number, number, number],
  maxFeatures = 15000
): Promise<ClimateFeatureCollection> {
  // 각 구역에서 3000개씩 = 최대 15000개
  return fetchFromMultipleRegions(fetchRiverData, Math.ceil(maxFeatures / GYEONGGI_REGIONS.length));
}

/**
 * 경기도 전체 범위 BBOX
 */
export const GYEONGGI_BBOX: [number, number, number, number] = [
  126.3, 36.9, 127.9, 38.3
];

/**
 * 특정 좌표 주변의 피처 찾기
 */
export function findNearestFeature(
  features: ClimateFeature[],
  coordinates: Coordinates,
  maxDistance = 0.1 // 약 10km
): ClimateFeature | null {
  if (features.length === 0) return null;

  let nearest: ClimateFeature | null = null;
  let minDistance = Infinity;

  for (const feature of features) {
    const centroid = getFeatureCentroid(feature);
    if (!centroid) continue;

    const distance = Math.sqrt(
      Math.pow(centroid[0] - coordinates[0], 2) +
      Math.pow(centroid[1] - coordinates[1], 2)
    );

    if (distance < minDistance && distance < maxDistance) {
      minDistance = distance;
      nearest = feature;
    }
  }

  return nearest;
}

/**
 * 피처의 중심점 계산
 */
export function getFeatureCentroid(feature: ClimateFeature): Coordinates | null {
  const { geometry } = feature;

  if (!geometry || !geometry.coordinates) {
    return null;
  }

  try {
    if (geometry.type === 'Point') {
      const coords = geometry.coordinates as number[];
      return [coords[0], coords[1]];
    }

    if (geometry.type === 'LineString') {
      // LineString: [[lng, lat], [lng, lat], ...]
      const lineCoords = geometry.coordinates as number[][];
      if (lineCoords.length === 0) return null;

      // 중간점 사용
      const midIndex = Math.floor(lineCoords.length / 2);
      return [lineCoords[midIndex][0], lineCoords[midIndex][1]];
    }

    if (geometry.type === 'MultiLineString') {
      // MultiLineString: [[[lng, lat], ...], [[lng, lat], ...]]
      const multiLineCoords = geometry.coordinates as number[][][];
      if (multiLineCoords.length === 0 || multiLineCoords[0].length === 0) return null;

      // 첫 번째 라인의 중간점
      const firstLine = multiLineCoords[0];
      const midIndex = Math.floor(firstLine.length / 2);
      return [firstLine[midIndex][0], firstLine[midIndex][1]];
    }

    if (geometry.type === 'Polygon') {
      const polygonCoords = geometry.coordinates as number[][][];
      if (polygonCoords.length === 0 || polygonCoords[0].length === 0) return null;

      const coords = polygonCoords[0];
      const sum = coords.reduce(
        (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
        [0, 0]
      );
      return [sum[0] / coords.length, sum[1] / coords.length];
    }

    if (geometry.type === 'MultiPolygon') {
      const multiPolygonCoords = geometry.coordinates as number[][][][];
      if (multiPolygonCoords.length === 0 || multiPolygonCoords[0].length === 0) return null;

      const firstPolygon = multiPolygonCoords[0];
      const coords = firstPolygon[0];
      const sum = coords.reduce(
        (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
        [0, 0]
      );
      return [sum[0] / coords.length, sum[1] / coords.length];
    }
  } catch (error) {
    console.error('Error calculating centroid:', error, geometry);
    return null;
  }

  return null;
}

/**
 * API 상태 확인
 */
export function getApiStatus(): {
  hasApiKey: boolean;
  layers: typeof LAYER_NAMES;
} {
  return {
    hasApiKey: Boolean(API_KEY),
    layers: LAYER_NAMES,
  };
}

/**
 * 피처 속성에서 위험도 추출 (정규화)
 */
export function extractRiskFromProperties(
  properties: Record<string, unknown>,
  mode: 'heat' | 'flood'
): number {
  // 다양한 속성 이름 시도
  const riskKeys = mode === 'heat'
    ? ['risk_level', 'heat_risk', 'risk', 'RISK', 'risk_idx', 'utci_risk']
    : ['risk_level', 'flood_risk', 'risk', 'RISK', 'flood_depth', 'depth'];

  for (const key of riskKeys) {
    const value = properties[key];
    if (typeof value === 'number') {
      // 0-1 범위로 정규화 (5등급이면 /5, 100점이면 /100)
      if (value <= 1) return value;
      if (value <= 5) return value / 5;
      if (value <= 10) return value / 10;
      if (value <= 100) return value / 100;
      return Math.min(1, value / 1000);
    }
  }

  // 위험도를 찾지 못한 경우 기본값
  return 0.5;
}
