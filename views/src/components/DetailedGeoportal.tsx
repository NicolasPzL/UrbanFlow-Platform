import React, { useEffect, useMemo, useState } from "react";
import InteractiveMap from "./GeoportalMap";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Filter, MapPin, Activity, Users, Eye, Compass, AlertTriangle } from "lucide-react";
import { AuthState, MapMode, CabinData, StationData } from "../types";
import { MapModeToggle } from "./ui/MapModeToggle";

interface DetailedGeoportalProps {
  authState?: AuthState;
}

type PrivateStats = {
  activeCabins?: number;
  avgVelocity?: number | null;
  totalPassengers?: number | null;
  avgETA?: string | null;
  lastUpdate?: string | null;
  systemStatus?: { level: string; label: string };
};

type PrivateResponse = {
  stations: StationData[];
  cabins: CabinData[];
  stats: PrivateStats;
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  normal: "default",
  warning: "secondary",
  alert: "destructive",
  unknown: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  normal: "Operativo",
  warning: "Alerta",
  alert: "Crítico",
  unknown: "Sin estado",
};

const formatNumber = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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

export function DetailedGeoportal({ authState }: DetailedGeoportalProps) {
  const [filteredStatus, setFilteredStatus] = useState<string>("all");
  const [selectedView, setSelectedView] = useState<string>("overview");
  const [stations, setStations] = useState<StationData[]>([]);
  const [cabins, setCabins] = useState<CabinData[]>([]);
  const [stats, setStats] = useState<PrivateStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("2d");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await fetch("/api/map/private", { credentials: "include" });
        if (!resp.ok) throw new Error("No se pudo cargar el geoportal detallado");
        const json = await resp.json();
        const payload: PrivateResponse = json?.data ?? { stations: [], cabins: [], stats: {} };

        setStations(Array.isArray(payload?.stations) ? payload.stations : []);
        setCabins(Array.isArray(payload?.cabins) ? payload.cabins : []);
        setStats(payload?.stats ?? {});
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredCabins = filteredStatus === "all"
    ? cabins
    : cabins.filter((cabin) => (cabin.status ?? "unknown") === filteredStatus);

  const statusCounts = useMemo(() => ({
    normal: cabins.filter((cabin) => (cabin.status ?? "unknown") === "normal").length,
    warning: cabins.filter((cabin) => (cabin.status ?? "unknown") === "warning").length,
    alert: cabins.filter((cabin) => (cabin.status ?? "unknown") === "alert").length,
    unknown: cabins.filter((cabin) => (cabin.status ?? "unknown") === "unknown").length,
  }), [cabins]);

  const avgRms = useMemo(() => {
    const values = cabins
      .map((cabin) => cabin.rms)
      .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
    if (!values.length) return null;
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Number(average.toFixed(2));
  }, [cabins]);

  const totalPassengers = stats.totalPassengers ?? null;
  const avgVelocity = stats.avgVelocity ?? null;
  const avgETA = stats.avgETA ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {authState?.user?.rol === "cliente" ? "Geoportal Urban Flow" : "Geoportal Detallado"}
            </h1>
            <p className="text-gray-600 mt-2">
              {authState?.user?.rol === "cliente"
                ? "Monitorea en tiempo real la ubicación y estado de las cabinas del sistema"
                : "Vista avanzada del sistema con datos técnicos y controles operacionales"}
            </p>
          </div>

          {authState?.user?.rol !== "cliente" && (
            <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
              <Select value={filteredStatus} onValueChange={setFilteredStatus}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="normal">Operativo</SelectItem>
                  <SelectItem value="warning">Alerta</SelectItem>
                  <SelectItem value="alert">Crítico</SelectItem>
                  <SelectItem value="unknown">Sin estado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedView} onValueChange={setSelectedView}>
                <SelectTrigger className="w-48">
                  <Eye className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Vista General</SelectItem>
                  <SelectItem value="technical">Vista Técnica</SelectItem>
                  <SelectItem value="operational">Vista Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* System Overview Cards */}
        {authState?.user?.rol !== "cliente" && (
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado Operativo</CardTitle>
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts.normal}</div>
                <p className="text-xs text-muted-foreground">
                  cabinas funcionando normalmente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Alerta</CardTitle>
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts.warning}</div>
                <p className="text-xs text-muted-foreground">
                  requieren atención
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado Crítico</CardTitle>
                <div className="h-3 w-3 rounded-full bg-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts.alert}</div>
                <p className="text-xs text-muted-foreground">
                  mantenimiento urgente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cabinas sin estado</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts.unknown}</div>
                <p className="text-xs text-muted-foreground">
                  requieren revisión de sensor
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Interactive Map */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Mapa Operacional Detallado</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <MapModeToggle mode={mapMode} onModeChange={setMapMode} />
                <Badge variant="outline">
                  {filteredCabins.length} de {cabins.length} cabinas mostradas
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-96 w-full items-center justify-center text-sm text-gray-500">
                Cargando mapa...
              </div>
            ) : error ? (
              <div className="flex h-96 w-full items-center justify-center text-sm text-red-600">
                {error}
              </div>
            ) : (
              <InteractiveMap
                cabins={filteredCabins}
                stations={stations}
                isPublic={false}
                showSensitiveInfo={authState?.user?.rol !== "cliente"}
                className="h-96 w-full"
                mode={mapMode}
                autoFocus="stations"
              />
            )}
          </CardContent>
        </Card>

        {/* Technical Parameters - Solo para usuarios con permisos */}
        {authState?.user?.rol !== "cliente" && (
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Parámetros Técnicos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">Vibración Promedio</div>
                    <div className="text-2xl font-bold">
                      {avgRms === null ? "--" : `${formatNumber(avgRms, 2)} RMS`}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">Velocidad Promedio</div>
                    <div className="text-2xl font-bold">
                      {avgVelocity === null ? "--" : `${formatNumber(avgVelocity, 1)} m/s`}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Rangos Operacionales:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Vibración Normal:</span>
                      <span className="text-green-600">0.0 - 1.0 RMS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vibración Alerta:</span>
                      <span className="text-yellow-600">1.0 - 1.5 RMS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vibración Crítica:</span>
                      <span className="text-red-600">&gt; 1.5 RMS</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm">
                    Exportar Datos
                  </Button>
                  <Button variant="outline" size="sm">
                    Generar Reporte
                  </Button>
                  <Button variant="outline" size="sm">
                    Configurar Alertas
                  </Button>
                  <Button variant="outline" size="sm">
                    Vista Histórica
                  </Button>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="mb-2 font-medium text-blue-900">Información del Sistema</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div>Última actualización: {formatTime(stats.lastUpdate)}</div>
                    <div>Cabinas monitoreadas: {stats.activeCabins ?? 0}</div>
                    <div>Sensores con datos recientes: {cabins.filter((c) => c.last_update).length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Cabin List */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Detalles de Cabinas</CardTitle>
            <Badge variant="outline">{filteredCabins.length} resultados</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {filteredCabins.map((cabin) => {
                const status = cabin.status ?? "unknown";
                return (
                  <div
                    key={cabin.cabina_id}
                    className="border rounded-lg p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold text-gray-900">
                            Cabina {cabin.codigo_interno}
                          </h4>
                          <Badge variant={STATUS_BADGE_VARIANT[status] ?? "secondary"}>
                            {STATUS_LABEL[status] ?? STATUS_LABEL.unknown}
                          </Badge>
                        </div>

                        <div className="grid gap-4 text-sm text-gray-600 md:grid-cols-4">
                          <div>
                            <span className="block text-xs uppercase text-gray-500">Posición</span>
                            <span className="font-medium text-gray-900">
                              {cabin.latitud === null || cabin.longitud === null
                                ? "--"
                                : `${formatNumber(cabin.latitud, 4)}°, ${formatNumber(cabin.longitud, 4)}°`}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs uppercase text-gray-500">Velocidad</span>
                            <span className="font-medium text-gray-900">
                              {cabin.velocidad === null ? "--" : `${formatNumber(cabin.velocidad)} m/s`}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs uppercase text-gray-500">Altitud</span>
                            <span className="font-medium text-gray-900">
                              {cabin.altitud === null ? "--" : `${formatNumber(cabin.altitud)} m`}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs uppercase text-gray-500">Vibración RMS</span>
                            <span className="font-medium text-gray-900">
                              {cabin.rms === null ? "--" : `${formatNumber(cabin.rms, 2)} RMS`}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                          <div>
                            <strong>Estado:</strong>{" "}
                            <span className="capitalize">{cabin.estado_actual ?? "Sin información"}</span>
                          </div>
                          <div>
                            <strong>Clasificación IA:</strong>{" "}
                            <span className="capitalize">
                              {cabin.estado_procesado ?? "Sin análisis"}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Última medición: {formatTime(cabin.last_update)}
                        </div>
                      </div>

                      <div className="min-w-[120px] text-right">
                        <div className="text-sm text-gray-600">ETA estimada</div>
                        <div className="font-medium">{avgETA ?? "N/A"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!filteredCabins.length && (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  No hay cabinas que coincidan con el filtro seleccionado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}