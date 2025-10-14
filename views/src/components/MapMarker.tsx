import { motion } from "motion/react";
import { Cabin, Station } from "../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { MapPin, Users, Clock } from "lucide-react";

interface CabinMarkerProps {
  cabin: Cabin;
  isPublic?: boolean;
  onClick?: () => void;
}

export function CabinMarker({ cabin, isPublic = true, onClick }: CabinMarkerProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'alert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const MarkerComponent = (
    <motion.div
      className={`w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer ${getStatusColor(cabin.status)}`}
      animate={cabin.isMoving ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        position: 'absolute',
        left: `${cabin.position.x}%`,
        top: `${cabin.position.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={onClick}
      whileHover={{ scale: 1.3 }}
      role="button"
      tabIndex={0}
      aria-label={`Cabina ${cabin.id}, ${cabin.passengers} pasajeros, ETA ${cabin.eta}`}
    />
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {MarkerComponent}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-white border shadow-lg p-3 max-w-xs"
          sideOffset={5}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Cabina {cabin.id}</span>
              <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(cabin.status)}`}>
                {cabin.status === 'normal' ? 'Normal' : cabin.status === 'warning' ? 'Alerta' : 'Crítico'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>ETA: {cabin.eta}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{cabin.passengers} pax</span>
              </div>
            </div>
            
            {!isPublic && (
              <div className="text-xs text-gray-500 space-y-1">
                <div>Velocidad: {cabin.velocity} m/s</div>
                <div>Vibración: {cabin.vibrationLast} RMS</div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface StationMarkerProps {
  station: Station;
}

export function StationMarker({ station }: StationMarkerProps) {
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${station.position.x}%`,
        top: `${station.position.y}%`
      }}
    >
      <div className="flex flex-col items-center">
        <MapPin className={`h-6 w-6 ${station.type === 'terminal' ? 'text-blue-600' : 'text-blue-400'}`} />
        <span className="text-xs text-gray-700 bg-white px-2 py-1 rounded shadow-sm mt-1 whitespace-nowrap">
          {station.name}
        </span>
      </div>
    </div>
  );
}