/**
 * 지도 관련 타입 정의
 */

export type Coordinates = [number, number]; // [lng, lat]

export interface MapViewState {
  center: Coordinates;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface MapLayer {
  id: string;
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'raster';
  source: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  visible?: boolean;
}

export interface MapSource {
  id: string;
  type: 'geojson' | 'raster' | 'vector';
  url?: string;
  data?: GeoJSON.FeatureCollection;
  tiles?: string[];
  tileSize?: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskZone {
  id: string;
  coordinates: Coordinates[];
  riskLevel: RiskLevel;
  riskValue: number; // 0~1
}

