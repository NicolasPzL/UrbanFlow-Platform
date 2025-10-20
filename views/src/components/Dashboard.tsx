import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Activity, Users, Gauge, AlertTriangle } from "lucide-react";

type DashboardData = {
  kpis?: { id: string; title: string; value: string; change: number; status: 'positive'|'negative'|'neutral' }[];
  vibrationSeries?: { time: string; vibration: number; cabinId?: string }[];
  passengersSeries?: { hour: string; passengers: number }[];
  cabins?: any[];
  historicalData?: any[];
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
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'normal': return 'default';
      case 'warning': return 'secondary';
      case 'alert': return 'destructive';
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Operacional</h1>
          <p className="text-gray-600 mt-2">
            Monitoreo en tiempo real del sistema Urban Flow
          </p>
        </div>

        {/* Debug Info - Temporal */}
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded">
          <p className="text-sm text-blue-800">
            Debug: Cabina seleccionada: {selectedCabin} | Datos de vibración: {vibrationChartData.length} puntos
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(data.kpis || []).map((kpi) => (
            <Card key={kpi.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">
                  {kpi.id === 'kpi1' && <Activity />}
                  {kpi.id === 'kpi2' && <AlertTriangle />}
                  {kpi.id === 'kpi3' && <Users />}
                  {kpi.id === 'kpi4' && <Gauge />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center justify-between mt-2">
                  {formatChange(kpi.change)}
                  <span className="text-xs text-muted-foreground">vs período anterior</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vibración en Tiempo Real</CardTitle>
                <div className="flex items-center space-x-2">
                  <label htmlFor="cabin-select" className="text-sm font-medium text-gray-700">
                    Cabina:
                  </label>
                  <select
                    id="cabin-select"
                    value={selectedCabin}
                    onChange={(e) => setSelectedCabin(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {(data.cabins || []).map((cabin: any) => (
                      <option key={cabin.id} value={cabin.id}>
                        {cabin.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
              <CardTitle>Flujo de Pasajeros por Hora</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={passengersChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value}`, 'Pasajeros']}
                  />
                  <Bar dataKey="passengers" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Historical Data Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Historial de Cabinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded border">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>ID Cabina</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>Velocidad</TableHead>
                  <TableHead>Vibración</TableHead>
                  <TableHead>Pasajeros</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalData.map((record: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{record.cabinId}</TableCell>
                    <TableCell>{record.timestamp}</TableCell>
                    <TableCell>
                      {((record.position?.x ?? 0).toFixed(1))}, {((record.position?.y ?? 0).toFixed(1))}
                    </TableCell>
                    <TableCell>{fmtNum(record.velocity)} {fmtNum(record.velocity) === '-' ? '' : 'm/s'}</TableCell>
                    <TableCell>{fmtRms(record.vibration)}</TableCell>
                    <TableCell>{record.passengers}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(record.status)}>
                        {record.status === 'normal' ? 'Normal' : 
                         record.status === 'warning' ? 'Alerta' : 'Crítico'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cabin Status Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Cabinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {(data.cabins || []).map((cabin: any) => (
                <Card key={cabin.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{cabin.id}</span>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(cabin.status || 'unknown')}`}></div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Vel: {fmtNum(cabin.velocity)} {fmtNum(cabin.velocity) === '-' ? '' : 'm/s'}</div>
                      <div>Vib: {fmtRms(cabin.vibrationLast)}</div>
                      <div>Pax: {cabin.passengers ?? 0}</div>
                      <div>Sensor: {cabin.sensor_id ? cabin.sensor_id : 'Sin sensor'}</div>
                      <div>ETA: {cabin.eta}</div>
                    </div>
                    <Badge 
                      variant={getStatusVariant(cabin.status || 'default')} 
                      className="mt-2 text-xs"
                    >
                      {cabin.status === 'normal' ? 'Normal' : 
                       cabin.status === 'warning' ? 'Alerta' : cabin.status === 'alert' ? 'Crítico' : '—'}
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