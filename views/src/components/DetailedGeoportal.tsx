import React, { useEffect, useState } from "react";
import InteractiveMap from "./GeoportalMap";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
// Datos ahora vienen del backend público /api/map/public
import { Filter, MapPin, Activity, Users, Eye } from "lucide-react";
import { AuthState } from "../types";

interface DetailedGeoportalProps {
  authState?: AuthState;
}

export function DetailedGeoportal({ authState }: DetailedGeoportalProps) {
  const [filteredStatus, setFilteredStatus] = useState<string>("all");
  const [selectedView, setSelectedView] = useState<string>("overview");
  const [stations, setStations] = useState<any[]>([]);
  const [cabins, setCabins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await fetch('/api/map/public', { credentials: 'include' });
        if (!resp.ok) throw new Error('No se pudo cargar el geoportal detallado');
        const json = await resp.json();
        setStations(Array.isArray(json?.data?.stations) ? json.data.stations : []);
        setCabins(Array.isArray(json?.data?.cabins) ? json.data.cabins : []);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Carga inicial
    
    // Actualizar datos cada 5 segundos
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const filteredCabins = filteredStatus === "all"
    ? cabins
    : cabins.filter((c: any) => {
        const status = c.status || (c.estado_actual === 'operativo' ? 'normal' : 
                                   c.estado_actual === 'inusual' ? 'warning' : 'alert');
        return status === filteredStatus;
      });

  const statusCounts = {
    normal: cabins.filter((c: any) => {
      const status = c.status || (c.estado_actual === 'operativo' ? 'normal' : 
                                 c.estado_actual === 'inusual' ? 'warning' : 'alert');
      return status === 'normal';
    }).length,
    warning: cabins.filter((c: any) => {
      const status = c.status || (c.estado_actual === 'operativo' ? 'normal' : 
                                 c.estado_actual === 'inusual' ? 'warning' : 'alert');
      return status === 'warning';
    }).length,
    alert: cabins.filter((c: any) => {
      const status = c.status || (c.estado_actual === 'operativo' ? 'normal' : 
                                 c.estado_actual === 'inusual' ? 'warning' : 'alert');
      return status === 'alert';
    }).length,
  };

  const totalPassengers = 0; // Placeholder - no tenemos datos de pasajeros en la BD
  const avgVibration = '0.00'; // Placeholder - no tenemos datos de vibración en la BD
  const avgVelocity = cabins.length ? (cabins.reduce((s: number, c: any) => s + (c.velocidad || 0), 0) / cabins.length).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {authState?.user?.rol === 'cliente' ? 'Geoportal Urban Flow' : 'Geoportal Detallado'}
            </h1>
            <p className="text-gray-600 mt-2">
              {authState?.user?.rol === 'cliente' 
                ? 'Monitorea en tiempo real la ubicación y estado de las cabinas del sistema'
                : 'Vista avanzada del sistema con datos técnicos y controles operacionales'}
            </p>
          </div>
          
          {authState?.user?.rol !== 'cliente' && (
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
        {authState?.user?.rol !== 'cliente' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado Operativo</CardTitle>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
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
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
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
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
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
                <CardTitle className="text-sm font-medium">Carga del Sistema</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPassengers}</div>
                <p className="text-xs text-muted-foreground">
                  pasajeros totales
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Interactive Map */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Mapa Operacional Detallado</span>
              </CardTitle>
              <Badge variant="outline">
                {filteredCabins.length} de {cabins.length} cabinas mostradas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-96 w-full flex items-center justify-center text-sm text-gray-500">Cargando mapa...</div>
            ) : error ? (
              <div className="h-96 w-full flex items-center justify-center text-sm text-red-600">{error}</div>
            ) : (
              <InteractiveMap
                cabins={filteredCabins}
                stations={stations}
                isPublic={false}
                showSensitiveInfo={authState?.user?.rol !== 'cliente'}
                className="h-96 w-full"
              />
            )}
          </CardContent>
        </Card>

        {/* Technical Parameters - Solo para usuarios con permisos */}
        {authState?.user?.rol !== 'cliente' && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Parámetros Técnicos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Vibración Promedio</div>
                    <div className="text-2xl font-bold">{avgVibration} RMS</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Velocidad Promedio</div>
                    <div className="text-2xl font-bold">{avgVelocity} m/s</div>
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
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Información del Sistema</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>Última actualización: hace 2 segundos</div>
                    <div>Frecuencia de muestreo: 1 Hz</div>
                    <div>Sensores activos: 15/15</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Cabin List */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles de Cabinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {filteredCabins.map((cabin) => {
                const status = cabin.status || (cabin.estado_actual === 'operativo' ? 'normal' : 
                                               cabin.estado_actual === 'inusual' ? 'warning' : 'alert');
                return (
                  <div key={cabin.cabina_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">Cabina {cabin.codigo_interno}</h4>
                        {authState?.user?.rol !== 'cliente' && (
                          <Badge 
                            variant={status === 'normal' ? 'default' : 
                                    status === 'warning' ? 'secondary' : 'destructive'}
                          >
                            {status === 'normal' ? 'Operativo' : 
                             status === 'warning' ? 'Alerta' : 'Crítico'}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Posición:</span>
                          <div className="font-medium">
                            {cabin.latitud.toFixed(4)}, {cabin.longitud.toFixed(4)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Velocidad:</span>
                          <div className="font-medium">{cabin.velocidad} m/s</div>
                        </div>
                        {authState?.user?.rol !== 'cliente' && (
                          <>
                            <div>
                              <span className="text-gray-600">Vibración:</span>
                              <div className="font-medium">N/A</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Pasajeros:</span>
                              <div className="font-medium">N/A</div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {authState?.user?.rol !== 'cliente' && (
                        <div className="text-sm text-gray-600">
                          <strong>Estado:</strong> {cabin.estado_actual}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-600">ETA</div>
                      <div className="font-medium">N/A</div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}