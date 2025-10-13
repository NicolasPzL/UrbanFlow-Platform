import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Clock, Users, TrendingUp, MapPin, Calendar } from "lucide-react";

interface PublicMetric {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'good' | 'normal' | 'attention';
}

interface ServiceUpdate {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'maintenance' | 'improvement';
}

interface RouteInfo {
  mainRoute: {
    stations: string[];
    totalTime: number;
    activeStations: number;
  };
  schedules: {
    weekdays: string;
    saturdays: string;
    sundays: string;
  };
  frequency: {
    peak: string;
    normal: string;
    night: string;
  };
}

interface CitizenDashboardData {
  metrics: {
    activePassengers: number;
    waitTime: number;
    efficiency: number;
  };
  serviceUpdates: ServiceUpdate[];
  routeInfo: RouteInfo;
  systemStatus: 'operational' | 'maintenance' | 'disruption';
  stations: any[];
  cabins: any[];
}

export function CitizenDashboard() {
  const [data, setData] = useState<CitizenDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCitizenData = async () => {
      try {
        const response = await fetch('/api/citizen/dashboard');
        if (!response.ok) throw new Error('No se pudo cargar el dashboard ciudadano');
        const json = await response.json();
        console.log('Datos del dashboard ciudadano recibidos:', json);
        setData(json.data);
      } catch (e: any) {
        console.error('Error al cargar dashboard ciudadano:', e);
        setError(e?.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    fetchCitizenData();
    
    // Actualizar datos cada 30 segundos
    const interval = setInterval(fetchCitizenData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'attention': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'improvement': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  // Generar métricas basadas en los datos de la API
  const generateMetrics = () => {
    if (!data) return [];
    
    return [
      {
        id: 'passengers',
        title: 'Pasajeros Activos',
        value: data.metrics.activePassengers.toString(),
        description: 'Usuarios en el sistema actualmente',
        icon: Users,
        status: data.metrics.activePassengers > 50 ? 'attention' : 'good'
      },
      {
        id: 'wait-time',
        title: 'Tiempo de Espera',
        value: `${data.metrics.waitTime} min`,
        description: 'Tiempo promedio de espera en estaciones',
        icon: Clock,
        status: data.metrics.waitTime > 4 ? 'attention' : 'good'
      },
      {
        id: 'efficiency',
        title: 'Eficiencia del Servicio',
        value: `${data.metrics.efficiency}%`,
        description: 'Porcentaje de viajes completados a tiempo',
        icon: TrendingUp,
        status: data.metrics.efficiency > 90 ? 'good' : data.metrics.efficiency > 80 ? 'normal' : 'attention'
      }
    ];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del servicio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error al cargar la información</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">No hay datos disponibles</div>
        </div>
      </div>
    );
  }

  const metrics = generateMetrics();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Ciudadano</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Información en tiempo real sobre el sistema de transporte por cable aéreo Urban Flow
        </p>
        
        {/* System Status */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-full ${data.systemStatus === 'operational' ? 'bg-green-500' : data.systemStatus === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">
            {data.systemStatus === 'operational' ? 'Sistema Operativo' : 
             data.systemStatus === 'maintenance' ? 'Mantenimiento Programado' : 
             'Servicio Interrumpido'}
          </span>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <Card key={metric.id} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
                {/* Status indicator */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getStatusColor(metric.status)}`}></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Información de Rutas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Información de Rutas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium">Ruta Principal</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{data.routeInfo.mainRoute.stations.join(' → ')}</p>
                <p>Tiempo total: ~{data.routeInfo.mainRoute.totalTime} minutos</p>
                <p>{data.routeInfo.mainRoute.activeStations} estaciones activas</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Horarios de Servicio</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Lunes a Viernes: {data.routeInfo.schedules.weekdays}</p>
                <p>Sábados: {data.routeInfo.schedules.saturdays}</p>
                <p>Domingos: {data.routeInfo.schedules.sundays}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Frecuencia</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Hora pico: {data.routeInfo.frequency.peak}</p>
                <p>Hora normal: {data.routeInfo.frequency.normal}</p>
                <p>Hora nocturna: {data.routeInfo.frequency.night}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actualizaciones del Servicio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Actualizaciones del Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.serviceUpdates.map((update) => (
              <div key={update.id} className="border-l-4 border-blue-200 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{update.title}</h3>
                      <Badge variant="secondary" className={getUpdateTypeColor(update.type)}>
                        {update.type === 'maintenance' ? 'Mantenimiento' :
                         update.type === 'improvement' ? 'Mejora' : 'Información'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{update.message}</p>
                  </div>
                  <span className="text-xs text-gray-400">Hace {update.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nota informativa */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-medium text-blue-900">¿Necesitas más información?</h3>
            <p className="text-sm text-blue-700">
              Visita nuestro geoportal para ver la ubicación en tiempo real de las cabinas y planificar tu viaje.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}