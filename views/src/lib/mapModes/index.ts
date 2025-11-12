import type { MapRef } from 'react-map-gl';
import type { MapboxMap } from 'react-map-gl/dist/esm/mapbox-map';
import type { MapMode } from '../../types';

const BUILDINGS_LAYER_ID = '3d-buildings';

type MapLike = MapboxMap | ReturnType<MapRef['getMap']> | null | undefined;

type ModeConfig = {
  pitch: number;
  bearing: number;
  zoom?: number;
};

const MODE_CONFIG: Record<MapMode, ModeConfig> = {
  '2d': {
    pitch: 0,
    bearing: 0,
    zoom: 13,
  },
  '3d': {
    pitch: 60,
    bearing: -17.6,
    zoom: 14,
  },
};

const ensureBuildingsLayer = (map: MapLike) => {
  if (!map?.getSource('composite')) return;
  if (map.getLayer(BUILDINGS_LAYER_ID)) return;

  map.addLayer({
    id: BUILDINGS_LAYER_ID,
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height'],
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height'],
      ],
      'fill-extrusion-opacity': 0.6,
    },
  });
};

const removeBuildingsLayer = (map: MapLike) => {
  if (!map?.getLayer(BUILDINGS_LAYER_ID)) return;
  map.removeLayer(BUILDINGS_LAYER_ID);
};

export const applyMapMode = (
  map: MapLike,
  mode: MapMode,
  options: { animate?: boolean; persistLayer?: boolean } = {},
) => {
  if (!map) return;
  const config = MODE_CONFIG[mode];
  const { animate = true, persistLayer = false } = options;

  const targetZoom = config.zoom ?? map.getZoom();
  const animationOptions: Parameters<MapboxMap['easeTo']>[0] = {
    pitch: config.pitch,
    bearing: config.bearing,
    duration: animate ? 600 : 0,
  };

  if (typeof targetZoom === 'number') {
    animationOptions.zoom = targetZoom;
  }

  map.easeTo(animationOptions);

  if (mode === '3d') {
    ensureBuildingsLayer(map);
  } else if (!persistLayer) {
    removeBuildingsLayer(map);
  }
};

export const getDefaultViewState = (mode: MapMode) => {
  const config = MODE_CONFIG[mode];
  return {
    longitude: -75.56,
    latitude: 6.25,
    zoom: config.zoom ?? 13,
    pitch: config.pitch,
    bearing: config.bearing,
  };
};

