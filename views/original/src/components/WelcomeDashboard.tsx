import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart3, Map, Users, Activity, Shield, Clock, Zap } from "lucide-react";
import { AuthState, AppView } from "../types";

interface WelcomeDashboardProps {
  authState: AuthState;
  onViewChange: (view: AppView) => void;
}

export function WelcomeDashboard({ authState, onViewChange }: WelcomeDashboardProps) {
  const { user } = authState;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'analyst': return 'Analista';
      case 'operator': return 'Operario';
      case 'citizen': return 'Ciudadano';
      default: return 'Usuario';
    }
  };

  const tools = user?.role === 'citizen' ? [
    {
      title: "Mi Dashboard",
      description: "Información del sistema en tiempo real con métricas públicas, horarios y actualizaciones del servicio",
      icon: BarChart3,
      action: () => onViewChange('citizen-dashboard'),
      available: true,
      features: ["Información en tiempo real", "Estado del servicio", "Horarios actualizados"]
    },
    {
      title: "Geoportal Público",
      description: "Visualiza la ubicación de las cabinas en tiempo real y planifica tu viaje de manera eficiente",
      icon: Map,
      action: () => onViewChange('geoportal-public'),
      available: true,
      features: ["Ubicación de cabinas", "Tiempos de espera", "Rutas disponibles"]
    }
  ] : [
    {
      title: "Dashboard de KPIs",
      description: "Visualiza métricas clave del sistema en tiempo real, incluyendo rendimiento, ocupación y eficiencia operacional",
      icon: BarChart3,
      action: () => onViewChange('dashboard'),
      available: true,
      features: ["Métricas en tiempo real", "Análisis de rendimiento", "Reportes de ocupación"]
    },
    {
      title: "Geoportal Detallado",
      description: "Acceso completo al mapa interactivo con información detallada de cabinas, rutas y estado operacional",
      icon: Map,
      action: () => onViewChange('geoportal-detail'),
      available: true,
      features: ["Monitoreo IoT en tiempo real", "Control de rutas", "Estado de las cabinas"]
    },
    {
      title: "Gestión de Usuarios",
      description: "Administra usuarios del sistema, roles y permisos de acceso a las diferentes funcionalidades",
      icon: Users,
      action: () => onViewChange('user-management'),
      available: user?.role === 'admin',
      features: ["Gestión de roles", "Control de acceso", "Auditoría de usuarios"]
    }
  ];

  const systemStats = [
    {
      label: "Cabinas Activas",
      value: "24/24",
      icon: Activity,
      color: "text-green-600"
    },
    {
      label: "Sistema",
      value: "Operativo",
      icon: Shield,
      color: "text-green-600"
    },
    {
      label: "Tiempo Activo",
      value: "99.8%",
      icon: Clock,
      color: "text-blue-600"
    },
    {
      label: "Eficiencia",
      value: "95.2%",
      icon: Zap,
      color: "text-blue-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {getGreeting()}, {user?.name}
          </h1>
          <p className="text-lg text-gray-600">
            Bienvenido al sistema Urban Flow - {getRoleDisplay(user?.role || '')}
          </p>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {systemStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className={`font-semibold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Available Tools */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Herramientas Disponibles
            </h2>
            <p className="text-gray-600">
              Accede a las funcionalidades del sistema según tu rol y permisos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Card 
                  key={index} 
                  className={`border-0 shadow-lg hover:shadow-xl transition-all duration-200 ${
                    tool.available 
                      ? 'cursor-pointer hover:scale-105' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={tool.available ? tool.action : undefined}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl ${
                        tool.available 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{tool.title}</CardTitle>
                        {!tool.available && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                            Requiere permisos de administrador
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {tool.description}
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Características:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {tool.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {tool.available && (
                      <Button 
                        className="w-full mt-4" 
                        onClick={(e) => {
                          e.stopPropagation();
                          tool.action();
                        }}
                      >
                        Acceder
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {user?.role === 'citizen' ? 'Planifica tu Viaje' : 'Acceso Rápido al Monitoreo'}
            </h3>
            <p className="text-gray-600">
              {user?.role === 'citizen' 
                ? 'Ve directamente al geoportal para ver la ubicación de las cabinas en tiempo real'
                : 'Ve directamente al geoportal detallado para monitorear el sistema en tiempo real'
              }
            </p>
            <Button 
              size="lg"
              onClick={() => onViewChange(user?.role === 'citizen' ? 'geoportal-public' : 'geoportal-detail')}
              className="px-8"
            >
              <Map className="mr-2 h-5 w-5" />
              Ir al Geoportal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}