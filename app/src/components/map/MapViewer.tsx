'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map, NavigationControl, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Coordinates, MapViewState } from '../../types/map';
import type { SimulationMode } from '../../types/simulation';
import {
  buildWmsTileUrl,
  getLayerForMode,
  getWmsSourceId,
  getWmsLayerId,
  hasApiKey,
} from '../../lib/wms';

interface MapViewerProps {
  initialView?: MapViewState;
  selectedLocation?: Coordinates | null;
  onMapLoad?: (map: Map) => void;
  onMapClick?: (coordinates: Coordinates) => void;
  className?: string;
  mode?: SimulationMode;
  showWmsLayer?: boolean;
  wmsOpacity?: number;
}

// 경기도 중심 좌표
const DEFAULT_CENTER: Coordinates = [127.0, 37.4];
const DEFAULT_ZOOM = 10;

export function MapViewer({
  initialView,
  selectedLocation,
  onMapLoad,
  onMapClick,
  className = '',
  mode = 'heat',
  showWmsLayer = true,
  wmsOpacity = 0.6,
}: MapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wmsError, setWmsError] = useState<string | null>(null);

  // 마커 업데이트
  const updateMarker = useCallback((coordinates: Coordinates | null) => {
    if (!map.current) return;

    // 기존 마커 제거
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }

    // 새 마커 추가
    if (coordinates) {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -left-3 -top-8 h-8 w-6">
            <svg viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#3B82F6"/>
              <circle cx="12" cy="12" r="5" fill="white"/>
            </svg>
          </div>
          <div class="absolute -left-1 -top-1 h-2 w-2 animate-ping rounded-full bg-blue-400"></div>
          <div class="h-2 w-2 rounded-full bg-blue-600"></div>
        </div>
      `;

      marker.current = new Marker({ element: el })
        .setLngLat(coordinates)
        .addTo(map.current);
    }
  }, []);

  // WMS 레이어 추가/업데이트
  const updateWmsLayer = useCallback((mapInstance: Map, currentMode: SimulationMode) => {
    if (!hasApiKey()) {
      setWmsError('API 키가 설정되지 않았습니다.');
      return;
    }

    const sourceId = getWmsSourceId(currentMode);
    const layerId = getWmsLayerId(currentMode);
    const layerName = getLayerForMode(currentMode);

    // 기존 레이어 제거
    ['heat', 'flood'].forEach((m) => {
      const oldLayerId = getWmsLayerId(m as SimulationMode);
      const oldSourceId = getWmsSourceId(m as SimulationMode);

      if (mapInstance.getLayer(oldLayerId)) {
        mapInstance.removeLayer(oldLayerId);
      }
      if (mapInstance.getSource(oldSourceId)) {
        mapInstance.removeSource(oldSourceId);
      }
    });

    if (!showWmsLayer) return;

    try {
      // WMS 소스 추가
      mapInstance.addSource(sourceId, {
        type: 'raster',
        tiles: [buildWmsTileUrl(layerName)],
        tileSize: 256,
        attribution: '© 경기기후플랫폼',
      });

      // WMS 레이어 추가
      mapInstance.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': wmsOpacity,
          'raster-fade-duration': 300,
        },
      });

      setWmsError(null);
    } catch (error) {
      console.error('WMS 레이어 로드 실패:', error);
      setWmsError('WMS 레이어를 로드할 수 없습니다.');
    }
  }, [showWmsLayer, wmsOpacity]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: initialView?.center || DEFAULT_CENTER,
      zoom: initialView?.zoom || DEFAULT_ZOOM,
      bearing: initialView?.bearing || 0,
      pitch: initialView?.pitch || 0,
      attributionControl: false,
    });

    // 네비게이션 컨트롤 추가
    mapInstance.addControl(new NavigationControl(), 'top-right');

    // Attribution 컨트롤 추가
    mapInstance.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // 지도 로드 완료 이벤트
    mapInstance.on('load', () => {
      setIsLoaded(true);
      // WMS 레이어 초기화
      updateWmsLayer(mapInstance, mode);
      onMapLoad?.(mapInstance);
    });

    // 지도 클릭 이벤트
    mapInstance.on('click', (e) => {
      onMapClick?.([e.lngLat.lng, e.lngLat.lat]);
    });

    map.current = mapInstance;

    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView, onMapLoad, onMapClick]);

  // 선택된 위치가 변경되면 마커 업데이트
  useEffect(() => {
    if (isLoaded) {
      updateMarker(selectedLocation ?? null);
    }
  }, [selectedLocation, isLoaded, updateMarker]);

  // 모드 변경 시 WMS 레이어 업데이트
  useEffect(() => {
    if (isLoaded && map.current) {
      updateWmsLayer(map.current, mode);
    }
  }, [mode, isLoaded, updateWmsLayer]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={mapContainer} className="h-full w-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="flex flex-col items-center space-y-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              지도 로딩 중...
            </span>
          </div>
        </div>
      )}
      {wmsError && (
        <div className="absolute bottom-4 left-4 rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-800 shadow-md dark:bg-yellow-900 dark:text-yellow-200">
          <span className="mr-1">⚠️</span>
          {wmsError}
        </div>
      )}
    </div>
  );
}
