// components/GeoportalMap.tsx
import React, { useState, useMemo, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, ArrowUp, Server, AlertCircle } from 'lucide-react';

// Definir tipos para window global
declare global {
  interface Window {
    mapboxgl?: any;
  }
}

// Import types from types file
import { CabinData, StationData } from '../types';

// Definición de tipos para las props del componente
type GeoportalMapProps = {
  cabins: CabinData[];
  stations: StationData[];
  className?: string;
  isPublic?: boolean;
};

// --- Sub-componente para el marcador de la cabina ---
const CabinMarker = ({ cabin }: { cabin: CabinData }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'warning': return 'bg-yellow-500';
      case 'alert': return 'bg-red-500';
      case 'normal': default: return 'bg-green-500';
    }
  };
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
  height = '100%'
}: GeoportalMapProps & { width?: string | number, height?: string | number }) => {
  const [popupInfo, setPopupInfo] = useState<CabinData | StationData | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN || '';

  // Verificar que el token de Mapbox esté configurado
  useEffect(() => {
    if (!mapboxToken) {
      setMapError('El token de Mapbox no está configurado. Por favor, verifica tus variables de entorno.');
      console.error('Error: VITE_MAPBOX_ACCESS_TOKEN no está definido');
    } else if (typeof window !== 'undefined' && !window.mapboxgl) {
      setMapError('Error al cargar Mapbox GL. Por favor, verifica tu conexión a internet.');
    }
  }, [mapboxToken]);

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
    cabins.map((cabin) => (
      <Marker key={`cabin-${cabin.cabina_id}`} longitude={cabin.longitud} latitude={cabin.latitud}>
        <div onMouseEnter={() => setPopupInfo(cabin)} onMouseLeave={() => setPopupInfo(null)}>
          <CabinMarker cabin={cabin} />
        </div>
      </Marker>
    )), [cabins]);

  const stationMarkers = useMemo(() => 
    stations.map((station) => (
      <Marker key={`station-${station.estacion_id}`} longitude={station.longitud} latitude={station.latitud}>
        <div onMouseEnter={() => setPopupInfo(station)} onMouseLeave={() => setPopupInfo(null)}>
          <MapPin className="text-blue-600 w-8 h-8 drop-shadow-lg cursor-pointer transform hover:scale-110 transition-transform" />
        </div>
      </Marker>
    )), [stations]);

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
            initialViewState={{
              longitude: -75.56,  // Centrado en Medellín por defecto
              latitude: 6.25,
              zoom: 13,
              pitch: 60,
              bearing: -20,
            }}
            style={{ width, height }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapboxToken}
            terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
            reuseMaps
            onError={(e: any) => {
              console.error('Error en el mapa:', e);
              setMapError('Error al cargar el mapa. Por favor, intente recargar la página.');
            }}
            onLoad={(e: any) => {
              setMapError(null);
              const map = e.target;
              
              // Add 3D buildings layer
              if (map.getLayer('3d-buildings')) {
                map.removeLayer('3d-buildings');
              }
              
              map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                  'fill-extrusion-color': '#aaa',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'height']
                  ],
                  'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'min_height']
                  ],
                  'fill-extrusion-opacity': 0.6
                }
              });

              // Add sky layer for better 3D visualization
              map.addLayer({
                'id': 'sky',
                'type': 'sky',
                'paint': {
                  'sky-type': 'atmosphere',
                  'sky-atmosphere-sun': [0.0, 0.0],
                  'sky-atmosphere-sun-intensity': 15
                }
              });
            }}
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
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-3 h-3 rounded-full ${
                      (popupInfo.status || (popupInfo.estado_actual === 'operativo' ? 'normal' : 
                       popupInfo.estado_actual === 'inusual' ? 'warning' : 'alert')) === 'normal' ? 'bg-green-500' : 
                      (popupInfo.status || (popupInfo.estado_actual === 'operativo' ? 'normal' : 
                       popupInfo.estado_actual === 'inusual' ? 'warning' : 'alert')) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="capitalize">{popupInfo.estado_actual}</span>
                  </div>
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
