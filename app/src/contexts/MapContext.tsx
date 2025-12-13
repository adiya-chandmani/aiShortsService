'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Map } from 'maplibre-gl';
import type { Coordinates, MapViewState } from '../types/map';

interface MapContextValue {
  map: Map | null;
  setMap: (map: Map | null) => void;
  viewState: MapViewState;
  setViewState: (state: MapViewState) => void;
  selectedLocation: Coordinates | null;
  setSelectedLocation: (coords: Coordinates | null) => void;
  flyTo: (center: Coordinates, zoom?: number) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

// 경기도 중심 좌표
const DEFAULT_VIEW_STATE: MapViewState = {
  center: [127.0, 37.4],
  zoom: 10,
  bearing: 0,
  pitch: 0,
};

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const [map, setMap] = useState<Map | null>(null);
  const [viewState, setViewState] = useState<MapViewState>(DEFAULT_VIEW_STATE);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);

  const flyTo = useCallback((center: Coordinates, zoom?: number) => {
    if (map) {
      map.flyTo({
        center,
        zoom: zoom ?? map.getZoom(),
        duration: 1500,
      });
      setViewState((prev) => ({
        ...prev,
        center,
        zoom: zoom ?? prev.zoom,
      }));
    }
  }, [map]);

  return (
    <MapContext.Provider
      value={{
        map,
        setMap,
        viewState,
        setViewState,
        selectedLocation,
        setSelectedLocation,
        flyTo,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}
