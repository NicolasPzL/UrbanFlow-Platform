import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, ComposedChart } from "recharts";
import { TrendingUp, TrendingDown, Activity, Users, Gauge, AlertTriangle, MapPin, Clock, Zap, BarChart3, Thermometer, Target, Navigation } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type DashboardData = {
  kpis?: { 
    id: string; 
    title: string; 
    value: string; 
    change: number; 
    status: 'positive'|'negative'|'neutral'|'warning';
    description?: string;
  }[];
  vibrationSeries?: { 
    time: string; 
    timestamp: string;
    vibration: number; 
    kurtosis: number;
    skewness: number;
    pico: number;
    crest_factor: number;
    zcr: number;
    frecuencia_media: number;
    frecuencia_dominante: number;
    amplitud_max_espectral: number;
    energia_banda_1: number;
    energia_banda_2: number;
    energia_banda_3: number;
    estado_procesado: string;
    cabinId?: string;
  }[];
  passengersSeries?: { hour: string; passengers: number }[];
  cabins?: any[];
  historicalData?: any[];
  availableCabins?: any[];
  user?: any;
  timestamp?: string;
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<string>('CB001');

  useEffect(() => {
    (async () => {
      try {
        // Cargar dashboard principal (Node)
        const resp = await fetch('/api/dashboard', { credentials: 'include' });
        if (!resp.ok) throw new Error('No se pudo cargar el dashboard');
        const json = await resp.json();
        console.log('Datos del dashboard recibidos:', json);
        setData(json.data || {});
        if (Array.isArray(json?.data?.cabins) && json.data.cabins.length > 0) {
          const firstId = String(json.data.cabins[0].id);
          setSelectedCabin(firstId);
        }
        // Paralelamente, intentar cargar resumen de analytics (FastAPI vía proxy)
        Promise.allSettled([
          fetch('/api/analytics/summary', { credentials: 'include' }),
          fetch('/api/analytics/system-health', { credentials: 'include' })
        ]).then(async (results) => {
          try {
            const [r1, r2] = results;
            if (r1.status === 'fulfilled' && r1.value.ok) {
              const a1 = await r1.value.json();
              console.log('Resumen analytics:', a1);
            }
            if (r2.status === 'fulfilled' && r2.value.ok) {
              const a2 = await r2.value.json();
              console.log('Salud del sistema (analytics):', a2);
            }
          } catch (e) {
            console.warn('No se pudo procesar analytics:', e);
          }
        });
      } catch (e: any) {
        console.error('Error al cargar dashboard:', e);
        setError(e?.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const historicalData = Array.isArray(data.historicalData) 
    ? data.historicalData 
    : Array.isArray(data.cabins)
    ? data.cabins.map((c: any) => ({
        cabinId: c.id ?? 'CB', timestamp: '2025-01-09 14:30:00', position: c.position ?? {x:0,y:0}, velocity: c.velocity ?? 0,
        vibration: c.vibrationLast ?? 0, passengers: c.passengers ?? 0, status: c.status ?? 'normal'
      }))
    : [];

  // Filtrar datos de vibración basados en la cabina seleccionada
  const vibrationChartData = Array.isArray(data.vibrationSeries) 
    ? data.vibrationSeries.filter(item => {
        // Si los datos incluyen cabinId, filtrar por él
        if (item.cabinId) {
          const matches = item.cabinId === selectedCabin;
          console.log(`Filtrando ${item.cabinId} vs ${selectedCabin}: ${matches}`);
          return matches;
        }
        // Si no hay cabinId, asumir que son datos de la cabina seleccionada
        return true;
      })
    : [];

  console.log('Datos de vibración filtrados:', vibrationChartData);
  console.log('Cabina seleccionada:', selectedCabin);
  const passengersChartData = Array.isArray(data.passengersSeries) ? data.passengersSeries : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'alert': return 'bg-red-500';
      case 'reaceleracion': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'normal': return 'default';
      case 'warning': return 'secondary';
      case 'alert': return 'destructive';
      case 'reaceleracion': return 'secondary';
      default: return 'outline';
    }
  };

  // Helpers de formato para mostrar mejor los datos faltantes
  const fmtNum = (v: any, digits = 2) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '-';
    return n.toFixed(digits);
  };
  const fmtRms = (v: any) => (Number.isNaN(Number(v)) ? '-' : `${Number(v).toFixed(4)} RMS`);

  const formatChange = (change: number) => {
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center space-x-1 ${colorClass}`}>
        <Icon className="h-3 w-3" />
        <span className="text-sm">{Math.abs(change)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error al cargar el dashboard</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Operacional</h1>
              <p className="text-gray-600 mt-2">
                Monitoreo en tiempo real del sistema Urban Flow
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Última actualización</div>
              <div className="text-lg font-medium text-gray-900">
                {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="text-sm font-medium text-green-800">Sistema Operativo</h3>
                <p className="text-xs text-green-600">
                  Microservicio de analítica conectado | {vibrationChartData.length} mediciones disponibles
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-600">Cabina seleccionada</div>
              <div className="text-sm font-medium text-green-800">{selectedCabin}</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(data.kpis || []).map((kpi) => (
            <Card key={kpi.id} className={`${kpi.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">
                  {kpi.id === 'kpi1' && <Activity />}
                  {kpi.id === 'kpi2' && <AlertTriangle />}
                  {kpi.id === 'kpi3' && <Gauge />}
                  {kpi.id === 'kpi4' && <MapPin />}
                  {kpi.id === 'kpi5' && <BarChart3 />}
                  {kpi.id === 'kpi6' && <Zap />}
                  {kpi.id === 'kpi7' && <Target />}
                  {kpi.id === 'kpi8' && <Navigation />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                {kpi.description && (
                  <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  {formatChange(kpi.change)}
                  <span className="text-xs text-muted-foreground">vs período anterior</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analytics Section Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Análisis Técnico</h2>
              <p className="text-gray-600 mt-1">
                Monitoreo avanzado de vibraciones y estados operativos
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="analytics-cabin-select" className="text-sm font-medium text-gray-700">
                Cabina:
              </label>
              <select
                id="analytics-cabin-select"
                value={selectedCabin}
                onChange={(e) => setSelectedCabin(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {(data.availableCabins || data.cabins || []).map((cabin: any) => (
                  <option key={cabin.id || cabin.codigo} value={cabin.id || cabin.codigo}>
                    {cabin.id || cabin.codigo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <Tabs defaultValue="vibration" className="w-full">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto bg-gray-50 rounded-lg p-1">
                <TabsTrigger 
                  value="vibration" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500 py-3 px-2 rounded-md font-medium"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-semibold">Análisis Vibracional</span>
                    <span className="text-xs text-gray-500 hidden sm:block">RMS, Kurtosis, Crest</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="spectral"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500 py-3 px-2 rounded-md font-medium"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-semibold">Análisis Espectral</span>
                    <span className="text-xs text-gray-500 hidden sm:block">Frecuencias</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="operational"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500 py-3 px-2 rounded-md font-medium"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-semibold">Estados Operativos</span>
                    <span className="text-xs text-gray-500 hidden sm:block">Distribución</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="energy"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500 py-3 px-2 rounded-md font-medium"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-semibold">Energía por Bandas</span>
                    <span className="text-xs text-gray-500 hidden sm:block">Baja, Media, Alta</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="vibration" className="mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vibración en Tiempo Real</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={vibrationChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 3]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value} RMS`, 'Vibración']}
                          labelFormatter={(label) => `${selectedCabin} - ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="vibration" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Métricas de Vibración</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">RMS Promedio:</span>
                          <span className="font-medium">{vibrationChartData.length > 0 ? (vibrationChartData.reduce((sum, d) => sum + d.vibration, 0) / vibrationChartData.length).toFixed(4) : '0.0000'} RMS</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Pico Máximo:</span>
                          <span className="font-medium">{vibrationChartData.length > 0 ? Math.max(...vibrationChartData.map(d => d.pico || 0)).toFixed(4) : '0.0000'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Crest Factor:</span>
                          <span className="font-medium">{vibrationChartData.length > 0 ? (vibrationChartData.reduce((sum, d) => sum + (d.crest_factor || 0), 0) / vibrationChartData.length).toFixed(2) : '0.00'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Kurtosis:</span>
                          <span className="font-medium">{vibrationChartData.length > 0 ? (vibrationChartData.reduce((sum, d) => sum + (d.kurtosis || 0), 0) / vibrationChartData.length).toFixed(3) : '0.000'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Skewness:</span>
                          <span className="font-medium">{vibrationChartData.length > 0 ? (vibrationChartData.reduce((sum, d) => sum + (d.skewness || 0), 0) / vibrationChartData.length).toFixed(3) : '0.000'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ZCR:</span>
                          <span className="font-medium">{vibrationChartData.length > 0 ? (vibrationChartData.reduce((sum, d) => sum + (d.zcr || 0), 0) / vibrationChartData.length).toFixed(3) : '0.000'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="spectral" className="mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Análisis de Frecuencias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={vibrationChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="frecuencia_media" fill="#8884d8" stroke="#8884d8" />
                        <Line type="monotone" dataKey="frecuencia_dominante" stroke="#82ca9d" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Amplitud Espectral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={vibrationChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="amplitud_max_espectral" fill="#ff7300" stroke="#ff7300" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="operational" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Estados Operativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vibrationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="estado_procesado" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="energy" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Banda Baja (0-50 Hz)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={vibrationChartData}>
                        <Area type="monotone" dataKey="energia_banda_1" fill="#8884d8" stroke="#8884d8" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Banda Media (50-200 Hz)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={vibrationChartData}>
                        <Area type="monotone" dataKey="energia_banda_2" fill="#82ca9d" stroke="#82ca9d" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                      <CardTitle>Banda Alta (&gt;200 Hz)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={vibrationChartData}>
                        <Area type="monotone" dataKey="energia_banda_3" fill="#ffc658" stroke="#ffc658" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Historical Data Table */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historial de Cabinas</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {historicalData.length} registros disponibles
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor="history-cabin-select" className="text-sm font-medium text-gray-700">
                  Cabina:
                </label>
                <select
                  id="history-cabin-select"
                  value={selectedCabin}
                  onChange={(e) => setSelectedCabin(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas las cabinas</option>
                  {(data.availableCabins || data.cabins || []).map((cabin: any) => (
                    <option key={cabin.id || cabin.codigo} value={cabin.id || cabin.codigo}>
                      {cabin.id || cabin.codigo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="max-h-80 overflow-y-auto rounded border border-gray-200 shadow-sm scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                  <TableRow className="hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">ID Cabina</TableHead>
                    <TableHead className="font-semibold text-gray-700">Timestamp</TableHead>
                    <TableHead className="font-semibold text-gray-700">Posición</TableHead>
                    <TableHead className="font-semibold text-gray-700">Velocidad</TableHead>
                    <TableHead className="font-semibold text-gray-700">Vibración</TableHead>
                    <TableHead className="font-semibold text-gray-700">Estado Operativo</TableHead>
                    <TableHead className="font-semibold text-gray-700">Métricas</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {historicalData.map((record: any, index: number) => (
                  <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium text-sm">{record.cabinId}</TableCell>
                    <TableCell className="text-sm text-gray-600">{record.timestamp}</TableCell>
                    <TableCell className="text-sm">
                      {((record.position?.x ?? 0).toFixed(1))}, {((record.position?.y ?? 0).toFixed(1))}
                    </TableCell>
                    <TableCell className="text-sm">{fmtNum(record.velocity)} {fmtNum(record.velocity) === '-' ? '' : 'm/s'}</TableCell>
                    <TableCell className="text-sm">{fmtRms(record.vibration)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(record.status)} className="text-xs">
                        {record.estado_procesado || record.status || 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1 text-gray-600">
                        <div>Kurt: {fmtNum(record.kurtosis, 3)}</div>
                        <div>Skew: {fmtNum(record.skewness, 3)}</div>
                        <div>Pico: {fmtNum(record.pico, 3)}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </div>
              {historicalData.length > 8 && (
                <div className="absolute bottom-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full shadow-sm animate-pulse">
                  📜 {historicalData.length} registros - Scroll para ver más
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cabin Status Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Cabinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(data.cabins || []).map((cabin: any) => (
                <Card key={cabin.id} className={`relative ${cabin.status === 'warning' ? 'border-yellow-200' : cabin.status === 'alert' ? 'border-red-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-lg">{cabin.id}</span>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(cabin.status || 'unknown')}`}></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Velocidad:</span>
                        <span className="font-medium">{fmtNum(cabin.velocity)} {fmtNum(cabin.velocity) === '-' ? '' : 'm/s'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vibración:</span>
                        <span className="font-medium">{fmtRms(cabin.vibrationLast)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className="font-medium">{cabin.statusProcessed || cabin.status || 'Normal'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sensor:</span>
                        <span className="font-medium">{cabin.sensor_id ? `#${cabin.sensor_id}` : 'Sin sensor'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Movimiento:</span>
                        <span className="font-medium">{cabin.isMoving ? 'En movimiento' : 'Detenido'}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={getStatusVariant(cabin.status || 'default')} 
                      className="mt-3 text-xs w-full justify-center"
                    >
                      {cabin.status === 'normal' ? 'Normal' : 
                       cabin.status === 'warning' ? 'Alerta' : 
                       cabin.status === 'alert' ? 'Crítico' : 'Desconocido'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}