import React, { useEffect, useState, useCallback } from "react";
import InteractiveMap from "./GeoportalMap";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { MapMode, CabinData, StationData } from "../types";
import { MapModeToggle } from "./ui/MapModeToggle";

type PublicMapData = {
  message?: string;
  timestamp?: string;
  stations?: StationData[];
  cabins?: CabinData[];
  stats?: {
    activeCabins?: number;
    totalPassengers?: number | null;
    avgETA?: string | null;
    lastUpdate?: string | null;
    systemStatus?: { level: string; label: string };
  };
};

const formatTime = (isoDate?: string | null) => {
  if (!isoDate) return "--:--";
  try {
    return new Date(isoDate).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
};

export function PublicGeoportal() {
  const [data, setData] = useState<PublicMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [mapMode, setMapMode] = useState<MapMode>('2d');

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      const resp = await fetch('/api/map/public', { credentials: 'include' });
      if (!resp.ok) throw new Error('No se pudo cargar el geoportal');
      const json = await resp.json();
      setData(json.data || {});
      setLastUpdate(new Date());
      setError(null);
      setConnectionStatus('connected');
    } catch (e: any) {
      setError(e?.message || 'Error al cargar');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData(); // Initial load
    
    const interval = setInterval(() => {
      fetchData(); // Poll every 5 seconds
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeCabins = data?.stats?.activeCabins ?? 0;
  const totalPassengers = data?.stats?.totalPassengers ?? null;
  const avgETA = data?.stats?.avgETA ?? null;
  const systemStatus = data?.stats?.systemStatus ?? { level: 'unknown', label: 'Sin datos' };
  const cabinsCount = data?.cabins?.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center space-x-4">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Geoportal Urban Flow
            </h1>
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </Button>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Monitorea en tiempo real el estado de nuestro sistema de transporte por cable aéreo. 
            Consulta ubicaciones, tiempos estimados y ocupación de las cabinas.
          </p>
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-900">{systemStatus.label}</span>
              <span className="ml-2 text-gray-500">Estado general del sistema</span>
            </div>
            <div>
              Cabinas activas: <span className="font-semibold text-gray-900">{activeCabins}</span>
            </div>
            <div>
              Pasajeros registrados:{" "}
              <span className="font-semibold text-gray-900">
                {totalPassengers === null ? "--" : totalPassengers}
              </span>
            </div>
            <div>
              ETA promedio:{" "}
              <span className="font-semibold text-gray-900">{avgETA ?? "--:--"}</span>
            </div>
          </div>
        </div>

        {/* Interactive Map */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Mapa en Tiempo Real</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <MapModeToggle mode={mapMode} onModeChange={setMapMode} />
                <Badge variant="outline">
                  {cabinsCount} {cabinsCount === 1 ? "cabina" : "cabinas"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-96 w-full flex items-center justify-center text-sm text-gray-500">Cargando mapa...</div>
            ) : error ? (
              <div className="h-96 w-full flex items-center justify-center text-sm text-red-600">{error}</div>
            ) : (
              <InteractiveMap
                cabins={Array.isArray(data?.cabins) ? data!.cabins : []}
                stations={Array.isArray(data?.stations) ? data!.stations : []}
                isPublic={true}
                showSensitiveInfo={false}
                className="h-96 w-full"
                mode={mapMode}
                autoFocus="stations"
              />
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo aprovechar el geoportal?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Consejos rápidos:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Usa los controles del mapa para acercarte a estaciones o cabinas.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Cambia entre vista 2D y 3D para explorar el relieve de la ruta.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Revisa la hora de actualización para conocer la frescura de los datos.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Indicadores generales:</h4>
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold text-gray-900">Operativo:</span> servicio funcionando con normalidad.
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Alerta:</span> posible incidencia, monitoreo reforzado.
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Crítico:</span> intervención o cierre temporal.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-blue-900">
              Para acceder a reportes técnicos, historial y métricas detalladas inicia sesión como operador o administrador.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}