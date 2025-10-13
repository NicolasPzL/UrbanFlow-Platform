import { useState } from "react";
import { CabinMarker, StationMarker } from "./MapMarker";
import { Cabin, Station } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Clock, Users, Gauge, Activity, MapPin } from "lucide-react";

interface InteractiveMapProps {
  cabins: Cabin[];
  stations: Station[];
  isPublic?: boolean;
  className?: string;
}

export function InteractiveMap({ cabins, stations, isPublic = true, className = "" }: InteractiveMapProps) {
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);

  const handleCabinClick = (cabin: Cabin) => {
    if (!isPublic) {
      setSelectedCabin(cabin);
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

  // SVG path for cable lines connecting stations
  const cablePath = stations.reduce((path, station, index) => {
    if (index === 0) {
      return `M ${station.position.x} ${station.position.y}`;
    }
    return `${path} L ${station.position.x} ${station.position.y}`;
  }, '');

  return (
    <>
      <div className={`relative bg-gradient-to-br from-blue-50 to-gray-100 rounded-lg overflow-hidden ${className}`}>
        {/* Background map of Paris */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-gray-100"></div>
          
          {/* Seine River */}
          <div className="absolute top-1/2 left-0 w-full h-2 bg-blue-300 opacity-60 transform -rotate-12 origin-left"></div>
          <div className="absolute top-1/2 left-1/4 w-2/3 h-1 bg-blue-300 opacity-60 transform rotate-6"></div>
          
          {/* Parks and green areas */}
          <div className="absolute top-1/4 left-1/3 w-16 h-12 bg-green-200 opacity-40 rounded-full"></div>
          <div className="absolute bottom-1/3 right-1/4 w-20 h-16 bg-green-200 opacity-40 rounded-lg"></div>
          <div className="absolute top-2/3 left-1/6 w-12 h-10 bg-green-200 opacity-40 rounded-full"></div>
          
          {/* Buildings and urban areas */}
          <div className="absolute top-1/3 left-1/2 w-2 h-3 bg-gray-400 opacity-30"></div>
          <div className="absolute top-1/4 right-1/3 w-1 h-4 bg-gray-400 opacity-30"></div>
          <div className="absolute bottom-1/4 left-1/3 w-3 h-2 bg-gray-400 opacity-30"></div>
          <div className="absolute bottom-1/3 right-1/2 w-2 h-3 bg-gray-400 opacity-30"></div>
          
          {/* Street grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-0 w-full h-px bg-gray-600"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-gray-600"></div>
            <div className="absolute top-3/4 left-0 w-full h-px bg-gray-600"></div>
            <div className="absolute top-0 left-1/4 w-px h-full bg-gray-600"></div>
            <div className="absolute top-0 left-1/2 w-px h-full bg-gray-600"></div>
            <div className="absolute top-0 left-3/4 w-px h-full bg-gray-600"></div>
          </div>
        </div>

        {/* Cable lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d={cablePath}
            stroke="#3B82F6"
            strokeWidth="0.3"
            fill="none"
            strokeDasharray="1,1"
            className="opacity-60"
          />
        </svg>

        {/* Stations */}
        {stations.map((station) => (
          <StationMarker key={station.id} station={station} />
        ))}

        {/* Cabins */}
        {cabins.map((cabin) => (
          <CabinMarker
            key={cabin.id}
            cabin={cabin}
            isPublic={isPublic}
            onClick={() => handleCabinClick(cabin)}
          />
        ))}

        {/* Map legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Leyenda</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Alerta</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Crítico</span>
            </div>
          </div>
        </div>

        {isPublic && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium">Sistema Urban Flow</p>
            <p className="text-xs opacity-90">París, Francia</p>
          </div>
        )}
        
        {!isPublic && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border px-3 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium text-gray-900">París, Francia</p>
            <p className="text-xs text-gray-600">48.8566° N, 2.3522° E</p>
          </div>
        )}
      </div>

      {/* Cabin Detail Modal (only for detailed view) */}
      {!isPublic && selectedCabin && (
        <Dialog open={!!selectedCabin} onOpenChange={() => setSelectedCabin(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>Cabina {selectedCabin.id}</span>
                <Badge variant={getStatusVariant(selectedCabin.status)}>
                  {selectedCabin.status === 'normal' ? 'Normal' : 
                   selectedCabin.status === 'warning' ? 'Alerta' : 'Crítico'}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Posición:</span>
                  </div>
                  <p className="text-sm font-medium">
                    X: {selectedCabin.position.x.toFixed(1)}%, Y: {selectedCabin.position.y.toFixed(1)}%
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Gauge className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Velocidad:</span>
                  </div>
                  <p className="text-sm font-medium">{selectedCabin.velocity} m/s</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">ETA:</span>
                  </div>
                  <p className="text-sm font-medium">{selectedCabin.eta}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Pasajeros:</span>
                  </div>
                  <p className="text-sm font-medium">{selectedCabin.passengers}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Activity className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Mediciones de Vibración:</span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Última medición:</span>
                      <span className="font-medium">{selectedCabin.vibrationLast} RMS</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Promedio:</span>
                      <span className="font-medium">{selectedCabin.vibrationAvg} RMS</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Estado:</strong> {selectedCabin.statusProcessed}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}