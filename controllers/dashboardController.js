// controllers/dashboardController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

// Datos mock para el dashboard
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

const mockVibrationData = [
  // CB001
  { time: '14:20', vibration: 0.8, cabinId: 'CB001' },
  { time: '14:21', vibration: 0.7, cabinId: 'CB001' },
  { time: '14:22', vibration: 0.9, cabinId: 'CB001' },
  { time: '14:23', vibration: 0.8, cabinId: 'CB001' },
  { time: '14:24', vibration: 0.7, cabinId: 'CB001' },
  { time: '14:25', vibration: 0.8, cabinId: 'CB001' },
  { time: '14:26', vibration: 0.9, cabinId: 'CB001' },
  // CB002
  { time: '14:20', vibration: 1.1, cabinId: 'CB002' },
  { time: '14:21', vibration: 1.3, cabinId: 'CB002' },
  { time: '14:22', vibration: 1.0, cabinId: 'CB002' },
  { time: '14:23', vibration: 1.2, cabinId: 'CB002' },
  { time: '14:24', vibration: 1.4, cabinId: 'CB002' },
  { time: '14:25', vibration: 1.1, cabinId: 'CB002' },
  { time: '14:26', vibration: 1.2, cabinId: 'CB002' },
  // CB003
  { time: '14:20', vibration: 2.1, cabinId: 'CB003' },
  { time: '14:21', vibration: 2.0, cabinId: 'CB003' },
  { time: '14:22', vibration: 2.2, cabinId: 'CB003' },
  { time: '14:23', vibration: 2.1, cabinId: 'CB003' },
  { time: '14:24', vibration: 2.0, cabinId: 'CB003' },
  { time: '14:25', vibration: 2.1, cabinId: 'CB003' },
  { time: '14:26', vibration: 2.2, cabinId: 'CB003' },
  // CB004
  { time: '14:20', vibration: 0.6, cabinId: 'CB004' },
  { time: '14:21', vibration: 0.5, cabinId: 'CB004' },
  { time: '14:22', vibration: 0.7, cabinId: 'CB004' },
  { time: '14:23', vibration: 0.6, cabinId: 'CB004' },
  { time: '14:24', vibration: 0.5, cabinId: 'CB004' },
  { time: '14:25', vibration: 0.6, cabinId: 'CB004' },
  { time: '14:26', vibration: 0.7, cabinId: 'CB004' },
  // CB005
  { time: '14:20', vibration: 0.9, cabinId: 'CB005' },
  { time: '14:21', vibration: 0.8, cabinId: 'CB005' },
  { time: '14:22', vibration: 1.0, cabinId: 'CB005' },
  { time: '14:23', vibration: 0.9, cabinId: 'CB005' },
  { time: '14:24', vibration: 0.8, cabinId: 'CB005' },
  { time: '14:25', vibration: 0.9, cabinId: 'CB005' },
  { time: '14:26', vibration: 1.0, cabinId: 'CB005' }
];

// Función para calcular KPIs
const calculateKPIs = () => {
  const cabins = mockCabins;
  
  // RMS Promedio
  const avgVibration = cabins.reduce((sum, cabin) => sum + cabin.vibrationAvg, 0) / cabins.length;
  
  // % Cabinas en Alerta
  const alertCabins = cabins.filter(cabin => cabin.status === 'alert' || cabin.status === 'warning').length;
  const alertPercentage = (alertCabins / cabins.length) * 100;
  
  // Pasajeros/Hora (simulado basado en total de pasajeros)
  const totalPassengers = cabins.reduce((sum, cabin) => sum + cabin.passengers, 0);
  const passengersPerHour = Math.round(totalPassengers * 2.5); // Factor de simulación
  
  // Velocidad Promedio
  const avgVelocity = cabins.reduce((sum, cabin) => sum + cabin.velocity, 0) / cabins.length;
  
  return [
    {
      id: 'kpi1',
      title: 'RMS Promedio',
      value: avgVibration.toFixed(2),
      change: -5.2,
      status: 'positive'
    },
    {
      id: 'kpi2',
      title: '% Cabinas en Alerta',
      value: `${alertPercentage.toFixed(0)}%`,
      change: 2.1,
      status: 'negative'
    },
    {
      id: 'kpi3',
      title: 'Pasajeros/Hora',
      value: passengersPerHour.toLocaleString(),
      change: 8.7,
      status: 'positive'
    },
    {
      id: 'kpi4',
      title: 'Velocidad Promedio',
      value: `${avgVelocity.toFixed(1)} m/s`,
      change: 0.3,
      status: 'neutral'
    }
  ];
};

// Función para generar datos de pasajeros por hora
const generatePassengersSeries = () => {
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  return hours.map(hour => ({
    hour,
    passengers: Math.floor(Math.random() * 200) + 100
  }));
};

// Función para generar datos históricos
const getCabinHistoricalData = () => {
  return mockCabins.map(cabin => ({
    cabinId: cabin.id,
    timestamp: '2025-01-09 14:30:00',
    position: cabin.position,
    velocity: cabin.velocity,
    vibration: cabin.vibrationLast,
    passengers: cabin.passengers,
    status: cabin.status
  }));
};

export const main = asyncHandler(async (req, res) => {
  const kpis = calculateKPIs();
  const vibrationSeries = mockVibrationData.map(data => ({
    time: data.time,
    vibration: data.vibration,
    cabinId: data.cabinId
  }));
  const passengersSeries = generatePassengersSeries();
  const historicalData = getCabinHistoricalData();
  
  console.log('Enviando datos de vibración:', vibrationSeries.slice(0, 5)); // Log primeros 5 elementos
  console.log('Total de datos de vibración:', vibrationSeries.length);
  
  res.json({
    ok: true,
    data: {
      kpis,
      vibrationSeries,
      passengersSeries,
      cabins: mockCabins,
      historicalData,
      user: req.user,
      timestamp: new Date().toISOString(),
    },
  });
});

export default { main };
