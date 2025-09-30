import { InteractiveMap } from "./InteractiveMap";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { mockCabins, mockStations } from "../data/mockData";
import { Activity, MapPin, Users, Clock } from "lucide-react";

export function PublicGeoportal() {
  const activeCabins = mockCabins.filter(cabin => cabin.isMoving).length;
  const totalPassengers = mockCabins.reduce((sum, cabin) => sum + cabin.passengers, 0);
  const avgETA = "14:35";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Geoportal Urban Flow
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Monitorea en tiempo real el estado de nuestro sistema de transporte por cable aéreo. 
            Consulta ubicaciones, tiempos estimados y ocupación de las cabinas.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sistema</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-green-500">
                  Operativo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Funcionamiento normal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cabinas Activas</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCabins}</div>
              <p className="text-xs text-muted-foreground">
                de {mockCabins.length} totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pasajeros Actuales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPassengers}</div>
              <p className="text-xs text-muted-foreground">
                en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgETA}</div>
              <p className="text-xs text-muted-foreground">
                próxima llegada
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Map */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Mapa en Tiempo Real</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InteractiveMap
              cabins={mockCabins}
              stations={mockStations}
              isPublic={true}
              className="h-96 w-full"
            />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Cómo usar el Geoportal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Interacciones disponibles:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Pasa el cursor sobre las cabinas para ver detalles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Observa el estado de cada cabina por colores</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Consulta tiempos estimados y ocupación</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Estados del sistema:</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600">Normal - Funcionamiento óptimo</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-gray-600">Alerta - Atención requerida</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-600">Crítico - Mantenimiento necesario</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Los datos se actualizan cada segundo mediante sensores IoT 
                instalados en cada cabina. Para acceder a funciones avanzadas de monitoreo y 
                análisis, inicia sesión como operador o administrador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}