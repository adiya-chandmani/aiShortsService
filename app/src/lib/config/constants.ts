/**
 * 프로젝트 전역 상수
 */

import type { Coordinates } from '../../types/map';

// 지도 설정
export const MAP_CONFIG = {
  /** 경기도 중심 좌표 */
  DEFAULT_CENTER: [127.0, 37.4] as Coordinates,
  /** 기본 줌 레벨 */
  DEFAULT_ZOOM: 10,
  /** 최소 줌 레벨 */
  MIN_ZOOM: 7,
  /** 최대 줌 레벨 */
  MAX_ZOOM: 18,
  /** 기본 지도 스타일 URL */
  DEFAULT_STYLE_URL: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const;

// 경기도 주요 도시 좌표
export const GYEONGGI_CITIES: Record<string, Coordinates> = {
  수원: [127.0286, 37.2636],
  성남: [127.1378, 37.4201],
  고양: [126.8320, 37.6584],
  용인: [127.1773, 37.2411],
  부천: [126.7660, 37.5036],
  안산: [126.8308, 37.3219],
  안양: [126.9520, 37.3943],
  남양주: [127.2165, 37.6363],
  화성: [126.8311, 37.1996],
  평택: [127.0899, 36.9921],
  의정부: [127.0338, 37.7377],
  시흥: [126.8030, 37.3801],
  파주: [126.7792, 37.7126],
  광명: [126.8667, 37.4786],
  김포: [126.7156, 37.6152],
} as const;

// 위험도 레벨 임계값
export const RISK_THRESHOLDS = {
  LOW: 0.25,
  MEDIUM: 0.5,
  HIGH: 0.75,
  CRITICAL: 1.0,
} as const;

// 위험도 색상 (지도 레이어용)
export const RISK_COLORS = {
  low: '#3b82f6',       // blue-500
  medium: '#f59e0b',    // amber-500
  high: '#ef4444',      // red-500
  critical: '#7c2d12',  // red-900
} as const;

// 폭염 위험도 가중치
export const HEAT_RISK_WEIGHTS = {
  HEAT_INDEX: 0.55,
  IMPERVIOUS: 0.25,
  GREEN: 0.20,
  SHELTER_PENALTY: 0.1,
} as const;

// 침수 위험도 가중치
export const FLOOD_RISK_WEIGHTS = {
  RAIN_RISK: 0.40,
  FLOOD_TRACE: 0.25,
  IMPERVIOUS: 0.20,
  RIVER_PROXIMITY: 0.15,
  DEFENSE_REDUCTION: 0.3,
} as const;

// 시뮬레이션 기본값
export const SIMULATION_DEFAULTS = {
  GREEN_REDUCTION: 0,
  IMPERVIOUS_INCREASE: 0,
  SHELTER_ENABLED: true,
  FLOOD_DEFENSE_ENABLED: false,
} as const;

// API 엔드포인트
export const API_ENDPOINTS = {
  SIMULATION_HEAT: '/api/simulation/heat',
  SIMULATION_FLOOD: '/api/simulation/flood',
} as const;

// 최대 레이어 수 (성능 최적화)
export const MAX_MAP_LAYERS = 5;
