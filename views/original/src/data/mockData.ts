import { User, Cabin, Station, KPI, VibrationData } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ana García',
    email: 'ana.garcia@urbanflow.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2025-01-09 14:30'
  },
  {
    id: '2',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@urbanflow.com',
    role: 'operator',
    status: 'active',
    lastLogin: '2025-01-09 12:15'
  },
  {
    id: '3',
    name: 'María Rodríguez',
    email: 'maria.rodriguez@urbanflow.com',
    role: 'analyst',
    status: 'active',
    lastLogin: '2025-01-08 16:45'
  },
  {
    id: '4',
    name: 'Pedro Sánchez',
    email: 'pedro.sanchez@urbanflow.com',
    role: 'operator',
    status: 'inactive',
    lastLogin: '2025-01-05 09:20'
  },
  {
    id: '5',
    name: 'Laura Torres',
    email: 'laura.torres@urbanflow.com',
    role: 'analyst',
    status: 'active',
    lastLogin: '2025-01-09 11:00'
  },
  {
    id: '6',
    name: 'Juan Pérez',
    email: 'juan.perez@gmail.com',
    role: 'citizen',
    status: 'active',
    lastLogin: '2025-01-09 13:45'
  }
];

export const mockStations: Station[] = [
  { id: 'ST001', name: 'A1', position: { x: 20, y: 80 }, type: 'terminal' },
  { id: 'ST002', name: 'B3', position: { x: 35, y: 65 }, type: 'intermediate' },
  { id: 'ST003', name: 'C7', position: { x: 50, y: 50 }, type: 'intermediate' },
  { id: 'ST004', name: 'D2', position: { x: 65, y: 35 }, type: 'intermediate' },
  { id: 'ST005', name: 'E9', position: { x: 80, y: 20 }, type: 'terminal' }
];

export const mockCabins: Cabin[] = [
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

export const mockKPIs: KPI[] = [
  {
    id: 'kpi1',
    title: 'RMS Promedio',
    value: '0.85',
    change: -5.2,
    status: 'positive'
  },
  {
    id: 'kpi2',
    title: '% Cabinas en Alerta',
    value: '12%',
    change: 2.1,
    status: 'negative'
  },
  {
    id: 'kpi3',
    title: 'Pasajeros/Hora',
    value: '1,847',
    change: 8.7,
    status: 'positive'
  },
  {
    id: 'kpi4',
    title: 'Velocidad Promedio',
    value: '4.1 m/s',
    change: 0.3,
    status: 'neutral'
  }
];

export const mockVibrationData: VibrationData[] = [
  { time: '14:20', vibration: 0.8, cabinId: 'CB001' },
  { time: '14:21', vibration: 0.7, cabinId: 'CB001' },
  { time: '14:22', vibration: 0.9, cabinId: 'CB001' },
  { time: '14:23', vibration: 0.8, cabinId: 'CB001' },
  { time: '14:24', vibration: 0.7, cabinId: 'CB001' },
  { time: '14:25', vibration: 0.8, cabinId: 'CB001' },
  { time: '14:26', vibration: 0.9, cabinId: 'CB001' },
  { time: '14:20', vibration: 1.1, cabinId: 'CB002' },
  { time: '14:21', vibration: 1.3, cabinId: 'CB002' },
  { time: '14:22', vibration: 1.0, cabinId: 'CB002' },
  { time: '14:23', vibration: 1.2, cabinId: 'CB002' },
  { time: '14:24', vibration: 1.4, cabinId: 'CB002' },
  { time: '14:25', vibration: 1.1, cabinId: 'CB002' },
  { time: '14:26', vibration: 1.2, cabinId: 'CB002' }
];

export const getCabinHistoricalData = () => {
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