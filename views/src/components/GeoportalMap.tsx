// components/GeoportalMap.tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, ArrowUp, Server, AlertCircle } from 'lucide-react';
import type { MapboxEvent } from 'mapbox-gl';

// Definir tipos para window global
declare global {
  interface Window {
    mapboxgl?: any;
  }
}

// Import types and helpers
import { CabinData, StationData, MapMode } from '../types';
import { applyMapMode, getDefaultViewState } from '../lib/mapModes';

// Definición de tipos para las props del componente
type GeoportalMapProps = {
  cabins: CabinData[];
  stations: StationData[];
  className?: string;
  isPublic?: boolean;
  showSensitiveInfo?: boolean; // Controla si se muestran estados de cabinas y otra info sensible
  mode?: MapMode;
  autoFocus?: 'stations' | 'cabins' | 'all' | 'none';
};

// --- Sub-componente para el marcador de la cabina ---
const CabinMarker = ({ cabin, showStatus = true }: { cabin: CabinData; showStatus?: boolean }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'warning': return 'bg-yellow-500';
      case 'alert': return 'bg-red-500';
      case 'reaceleracion': return 'bg-orange-500';
      case 'normal': default: return 'bg-green-500';
    }
  };
  
  // Si no debe mostrar estado sensible, usar color neutral
  if (!showStatus) {
    return <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md cursor-pointer transform hover:scale-125 transition-transform"></div>;
  }
  
  // Use mapped status if available, otherwise map from estado_actual
  const status = cabin.status || (cabin.estado_actual === 'operativo' ? 'normal' : 
                                  cabin.estado_actual === 'inusual' ? 'warning' : 'alert');
  const colorClass = getStatusColor(status);
  const finalClassName = `w-4 h-4 rounded-full ${colorClass} border-2 border-white shadow-md cursor-pointer transform hover:scale-125 transition-transform`;

  return <div className={finalClassName}></div>;
};

// --- Componente principal del mapa interactivo ---
const GeoportalMap = ({ 
  cabins = [],
  stations = [],
  className = '',
  width = '100%',
  height = '100%',
  showSensitiveInfo = true,
  mode = '2d',
  autoFocus = 'stations',
}: GeoportalMapProps & { width?: string | number; height?: string | number }) => {
  const [popupInfo, setPopupInfo] = useState<CabinData | StationData | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const hasAppliedAutoFocusRef = useRef(false);
  const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN || '';

  // Normaliza cabinas (asegurando coordenadas y valores numéricos válidos)
  const sanitizedCabins = useMemo<CabinData[]>(() => {
    return cabins.reduce<CabinData[]>((acc, cabin) => {
      if (cabin.latitud === null || cabin.longitud === null) {
        console.warn?.('[GeoportalMap] Cabina ignorada por coordenadas nulas', cabin);
        return acc;
      }

      const lat = Number(cabin.latitud);
      const lng = Number(cabin.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn?.('[GeoportalMap] Cabina ignorada por coordenadas inválidas', cabin);
        return acc;
      }

      const safeVelocity = Number.isFinite(Number(cabin.velocidad))
        ? Number(cabin.velocidad)
        : 0;

      acc.push({
        ...cabin,
        latitud: lat,
        longitud: lng,
        velocidad: safeVelocity,
      });
      return acc;
    }, []);
  }, [cabins]);

  // Normaliza estaciones
  const sanitizedStations = useMemo<StationData[]>(() => {
    return stations.reduce<StationData[]>((acc, station) => {
      if (station.latitud === null || station.longitud === null) {
        console.warn?.('[GeoportalMap] Estación ignorada por coordenadas nulas', station);
        return acc;
      }

      const lat = Number(station.latitud);
      const lng = Number(station.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn?.('[GeoportalMap] Estación ignorada por coordenadas inválidas', station);
        return acc;
      }

      acc.push({
        ...station,
        latitud: lat,
        longitud: lng,
      });
      return acc;
    }, []);
  }, [stations]);

  const resolvedMode = mode ?? '2d';
  const resolvedAutoFocus = autoFocus ?? 'stations';

  // Helper function para obtener el status de una cabina
  const getCabinStatus = (cabin: CabinData): string => {
    if (cabin.status) return cabin.status;
    switch ((cabin.estado_actual || '').toLowerCase()) {
      case 'operativo':
      case 'operativa':
        return 'normal';
      case 'inusual':
        return 'warning';
      case 'alerta':
        return 'alert';
      default:
        return 'unknown';
    }
  };

  // Helper function para obtener el color de status
  const getStatusColorClass = (status: string): string => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'reaceleracion': return 'bg-orange-500';
      case 'alert': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Verificar que el token de Mapbox esté configurado
  useEffect(() => {
    if (!mapboxToken) {
      setMapError('El token de Mapbox no está configurado. Por favor, verifica tus variables de entorno.');
      console.error('Error: VITE_MAPBOX_ACCESS_TOKEN no está definido');
    }
  }, [mapboxToken]);

  const applyAutoFocus = useCallback(
    (force = false) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      if (hasAppliedAutoFocusRef.current && !force) return;
      if (resolvedAutoFocus === 'none') return;

      const candidatePoints = (() => {
        if (resolvedAutoFocus === 'stations') return sanitizedStations;
        if (resolvedAutoFocus === 'cabins') return sanitizedCabins;
        if (resolvedAutoFocus === 'all') return [...sanitizedStations, ...sanitizedCabins];
        return [];
      })();

      const effectivePoints = candidatePoints.length > 0 ? candidatePoints : sanitizedCabins;
      if (!effectivePoints.length) return;

      const longitudes = effectivePoints.map((item) => Number(item.longitud));
      const latitudes = effectivePoints.map((item) => Number(item.latitud));
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);

      if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
        return;
      }

      if (effectivePoints.length === 1) {
        const point = effectivePoints[0] as CabinData | StationData;
        map.flyTo({
          center: [Number(point.longitud), Number(point.latitud)],
          zoom: Math.max(map.getZoom(), resolvedMode === '3d' ? 15 : 14),
          duration: 900,
        });
      } else {
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding: 80,
            duration: 900,
            maxZoom: resolvedMode === '3d' ? 16.5 : 15.5,
          },
        );
      }

      hasAppliedAutoFocusRef.current = true;
    },
    [resolvedAutoFocus, sanitizedStations, sanitizedCabins, resolvedMode],
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    applyMapMode(map, resolvedMode, { animate: true });
  }, [resolvedMode]);

  useEffect(() => {
    if (!sanitizedStations.length && !sanitizedCabins.length) {
      hasAppliedAutoFocusRef.current = false;
    }
  }, [sanitizedStations.length, sanitizedCabins.length]);

  useEffect(() => {
    applyAutoFocus();
  }, [applyAutoFocus]);

  if (mapError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-lg p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800">Error al cargar el mapa</h3>
        <p className="text-gray-600 mt-2">{mapError}</p>
      </div>
    );
  }

  const cabinMarkers = useMemo(() =>
    sanitizedCabins.map((cabin) => (
      <Marker key={`cabin-${cabin.cabina_id}`} longitude={Number(cabin.longitud)} latitude={Number(cabin.latitud)}>
        <div onMouseEnter={() => setPopupInfo(cabin)} onMouseLeave={() => setPopupInfo(null)}>
          <CabinMarker cabin={cabin} showStatus={showSensitiveInfo} />
        </div>
      </Marker>
    )), [sanitizedCabins, showSensitiveInfo]);

  const stationMarkers = useMemo(() =>
    sanitizedStations.map((station) => (
      <Marker key={`station-${station.estacion_id}`} longitude={Number(station.longitud)} latitude={Number(station.latitud)}>
        <div onMouseEnter={() => setPopupInfo(station)} onMouseLeave={() => setPopupInfo(null)}>
          <MapPin className="text-blue-600 w-8 h-8 drop-shadow-lg cursor-pointer transform hover:scale-110 transition-transform" />
        </div>
      </Marker>
    )), [sanitizedStations]);

  const handleMapLoad = useCallback((evt: MapboxEvent) => {
    setMapError(null);
    try {
      const mapInstance = mapRef.current?.getMap() ?? evt.target;
      applyMapMode(mapInstance, resolvedMode, { animate: false, persistLayer: resolvedMode === '3d' });
      applyAutoFocus(true);
      console.log('Mapa cargado correctamente');
    } catch (error) {
      console.error('Error durante la carga inicial del mapa:', error);
    }
  }, [resolvedMode, applyAutoFocus]);

  return (
    <div className={className}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {!mapboxToken ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center p-4">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Token de Mapbox no configurado</h3>
              <p className="text-gray-600 mt-2">Por favor, verifica la configuración de tu entorno.</p>
            </div>
          </div>
        ) : (
          <Map
            ref={mapRef}
            initialViewState={{
              ...getDefaultViewState(resolvedMode),
            }}
            style={{ width, height }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapboxToken}
            reuseMaps
            onError={(e: any) => {
              console.error('Error en el mapa:', e);
              setMapError('Error al cargar el mapa. Por favor, intente recargar la página.');
            }}
            onLoad={handleMapLoad}
            attributionControl={false}
      >
        <NavigationControl />
        <FullscreenControl />
        {cabinMarkers}
        {stationMarkers}
        {popupInfo && (
          <Popup
            longitude={Number(popupInfo.longitud)}
            latitude={Number(popupInfo.latitud)}
            onClose={() => setPopupInfo(null)}
            closeButton={false}
          >
            <div className="p-1 text-sm max-w-xs">
              {'codigo_interno' in popupInfo ? ( // Comprobamos si es una cabina
                <>
                  <h4 className="font-bold text-gray-800">Cabina: {popupInfo.codigo_interno}</h4>
                  {showSensitiveInfo && (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${getStatusColorClass(getCabinStatus(popupInfo))}`}></div>
                      <span className="capitalize">
                        {getCabinStatus(popupInfo) === 'normal' ? 'Operativo' :
                         getCabinStatus(popupInfo) === 'warning' ? 'Alerta' :
                         getCabinStatus(popupInfo) === 'alert' ? 'Crítico' :
                         getCabinStatus(popupInfo) === 'reaceleracion' ? 'Reaceleración' :
                         popupInfo.estado_actual}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 mt-1 text-gray-600">
                    <ArrowUp size={14} />
                    <span>Velocidad: {Number(popupInfo.velocidad).toFixed(2)} m/s</span>
                  </div>
                </>
              ) : ( // Si no, es una estación
                <>
                  <h4 className="font-bold text-gray-800">Estación: {popupInfo.nombre}</h4>
                   <div className="flex items-center space-x-2 mt-1 text-gray-600">
                    <Server size={14} />
                    <span className="capitalize">{popupInfo.tipo}</span>
                  </div>
                </>
              )}
            </div>
          </Popup>
        )}
          </Map>
        )}
      </div>
    </div>
  );
}

export default GeoportalMap;
