// controllers/citizenController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

// Datos mock para el dashboard ciudadano
const mockCabins = [
  {
    id: 'CB001',
    position: { x: 25, y: 75 },
    velocity: 4.2,
    passengers: 12,
    eta: '14:32',
    vibrationLast: 0.8,
    vibrationAvg: 0.7,
    status: 'normal',
    statusProcessed: 'En funcionamiento normal',
    isMoving: true
  },
  {
    id: 'CB002',
    position: { x: 42, y: 58 },
    velocity: 3.8,
    passengers: 8,
    eta: '14:35',
    vibrationLast: 1.2,
    vibrationAvg: 1.1,
    status: 'warning',
    statusProcessed: 'Vibración ligeramente elevada',
    isMoving: true
  },
  {
    id: 'CB003',
    position: { x: 58, y: 42 },
    velocity: 0,
    passengers: 15,
    eta: '14:40',
    vibrationLast: 2.1,
    vibrationAvg: 1.8,
    status: 'alert',
    statusProcessed: 'Detenida por mantenimiento',
    isMoving: false
  },
  {
    id: 'CB004',
    position: { x: 72, y: 28 },
    velocity: 4.5,
    passengers: 6,
    eta: '14:38',
    vibrationLast: 0.6,
    vibrationAvg: 0.65,
    status: 'normal',
    statusProcessed: 'En funcionamiento normal',
    isMoving: true
  },
  {
    id: 'CB005',
    position: { x: 30, y: 70 },
    velocity: 4.1,
    passengers: 10,
    eta: '14:36',
    vibrationLast: 0.9,
    vibrationAvg: 0.85,
    status: 'normal',
    statusProcessed: 'En funcionamiento normal',
    isMoving: true
  }
];

const mockStations = [
  { id: 'ST001', name: 'A1', position: { x: 20, y: 80 }, type: 'terminal' },
  { id: 'ST002', name: 'B3', position: { x: 35, y: 65 }, type: 'intermediate' },
  { id: 'ST003', name: 'C7', position: { x: 50, y: 50 }, type: 'intermediate' },
  { id: 'ST004', name: 'D2', position: { x: 65, y: 35 }, type: 'intermediate' },
  { id: 'ST005', name: 'E9', position: { x: 80, y: 20 }, type: 'terminal' }
];

// Función para calcular métricas ciudadanas
const calculateCitizenMetrics = () => {
  const cabins = mockCabins;
  
  // Pasajeros activos (total de pasajeros en todas las cabinas)
  const activePassengers = cabins.reduce((sum, cabin) => sum + cabin.passengers, 0);
  
  // Tiempo de espera promedio (simulado basado en estado de cabinas)
  const movingCabins = cabins.filter(cabin => cabin.isMoving).length;
  const totalCabins = cabins.length;
  const waitTime = totalCabins > 0 ? (totalCabins - movingCabins) * 2 + Math.random() * 2 : 2;
  
  // Eficiencia del servicio (basado en cabinas operativas)
  const operationalCabins = cabins.filter(cabin => cabin.status === 'normal').length;
  const efficiency = totalCabins > 0 ? (operationalCabins / totalCabins) * 100 : 100;
  
  return {
    activePassengers,
    waitTime: Math.round(waitTime * 10) / 10, // Redondear a 1 decimal
    efficiency: Math.round(efficiency)
  };
};

// Función para generar actualizaciones del servicio
const getServiceUpdates = () => {
  return [
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
    },
    {
      id: '4',
      title: 'Servicio Normal',
      message: 'Todas las estaciones operando normalmente. Tiempo de espera promedio: 3 minutos.',
      time: '30 minutos',
      type: 'info'
    }
  ];
};

// Función para obtener información de rutas
const getRouteInfo = () => {
  return {
    mainRoute: {
      stations: ['A1', 'B3', 'C7', 'D2', 'E9'],
      totalTime: 25,
      activeStations: 5
    },
    schedules: {
      weekdays: '5:30 AM - 10:30 PM',
      saturdays: '6:00 AM - 11:00 PM',
      sundays: '7:00 AM - 9:30 PM'
    },
    frequency: {
      peak: 'Cada 2-3 minutos',
      normal: 'Cada 4-5 minutos',
      night: 'Cada 6-8 minutos'
    }
  };
};

// Función para determinar el estado del sistema
const getSystemStatus = () => {
  const cabins = mockCabins;
  const alertCabins = cabins.filter(cabin => cabin.status === 'alert').length;
  const warningCabins = cabins.filter(cabin => cabin.status === 'warning').length;
  
  if (alertCabins > 0) {
    return 'disruption';
  } else if (warningCabins > 1) {
    return 'maintenance';
  } else {
    return 'operational';
  }
};

export const getCitizenDashboard = asyncHandler(async (req, res) => {
  const metrics = calculateCitizenMetrics();
  const serviceUpdates = getServiceUpdates();
  const routeInfo = getRouteInfo();
  const systemStatus = getSystemStatus();
  
  res.json({
    ok: true,
    data: {
      metrics,
      serviceUpdates,
      routeInfo,
      systemStatus,
      stations: mockStations,
      cabins: mockCabins,
      timestamp: new Date().toISOString(),
    },
  });
});

export default { getCitizenDashboard };
