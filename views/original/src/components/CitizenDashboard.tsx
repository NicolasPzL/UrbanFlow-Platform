import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Clock, Users, Zap, TrendingUp, MapPin, Calendar } from "lucide-react";

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

export function CitizenDashboard() {
  const [metrics, setMetrics] = useState<PublicMetric[]>([]);
  const [serviceUpdates, setServiceUpdates] = useState<ServiceUpdate[]>([]);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'maintenance' | 'disruption'>('operational');

  useEffect(() => {
    // Simular datos de métricas públicas en tiempo real
    const updateMetrics = () => {
      const currentTime = new Date();
      const basePassengers = 1200 + Math.floor(Math.sin(currentTime.getMinutes() / 10) * 300);
      const avgSpeed = 18 + Math.random() * 4; // 18-22 km/h
      const waitTime = 2 + Math.random() * 3; // 2-5 minutos
      
      setMetrics([
        {
          id: 'passengers',
          title: 'Pasajeros Activos',
          value: basePassengers.toString(),
          description: 'Usuarios en el sistema actualmente',
          icon: Users,
          status: basePassengers > 1400 ? 'attention' : 'good'
        },
        {
          id: 'speed',
          title: 'Velocidad Promedio',
          value: `${avgSpeed.toFixed(1)} km/h`,
          description: 'Velocidad promedio de las cabinas',
          icon: Zap,
          status: 'normal'
        },
        {
          id: 'wait-time',
          title: 'Tiempo de Espera',
          value: `${waitTime.toFixed(1)} min`,
          description: 'Tiempo promedio de espera en estaciones',
          icon: Clock,
          status: waitTime > 4 ? 'attention' : 'good'
        },
        {
          id: 'efficiency',
          title: 'Eficiencia del Servicio',
          value: '94%',
          description: 'Porcentaje de viajes completados a tiempo',
          icon: TrendingUp,
          status: 'good'
        }
      ]);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    // Simular actualizaciones del servicio
    setServiceUpdates([
      {
        id: '1',
        title: 'Mantenimiento Programado',
        message: 'Mantenimiento preventivo en estación C7 programado para el próximo domingo de 6:00 a 8:00 AM.',
        time: '2 horas',
        type: 'maintenance'
      },
      {
        id: '2',
        title: 'Nueva Estación',
        message: 'Próximamente: Nueva estación F4 conectará el centro comercial principal.',
        time: '1 día',
        type: 'improvement'
      },
      {
        id: '3',
        title: 'Horario Extendido',
        message: 'Durante la temporada navideña, el servicio estará disponible hasta las 11:00 PM.',
        time: '3 días',
        type: 'info'
      }
    ]);

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
          <div className={`w-3 h-3 rounded-full ${systemStatus === 'operational' ? 'bg-green-500' : systemStatus === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">
            {systemStatus === 'operational' ? 'Sistema Operativo' : 
             systemStatus === 'maintenance' ? 'Mantenimiento Programado' : 
             'Servicio Interrumpido'}
          </span>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <p>A1 → B3 → C7 → D2 → E9</p>
                <p>Tiempo total: ~25 minutos</p>
                <p>5 estaciones activas</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Horarios de Servicio</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Lunes a Viernes: 5:30 AM - 10:30 PM</p>
                <p>Sábados: 6:00 AM - 11:00 PM</p>
                <p>Domingos: 7:00 AM - 9:30 PM</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Frecuencia</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Hora pico: Cada 2-3 minutos</p>
                <p>Hora normal: Cada 4-5 minutos</p>
                <p>Hora nocturna: Cada 6-8 minutos</p>
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
            {serviceUpdates.map((update) => (
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