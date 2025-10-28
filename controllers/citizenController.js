// controllers/citizenController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

// Datos desde microservicio (reemplaza mocks)
const ANALYTICS_BASE_URL = process.env.ANALYTICS_BASE_URL || 'http://localhost:8001/api';

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Request failed ${r.status} ${url}`);
  return r.json();
};

const mapHealthToStatus = (s) => {
  const v = (s || '').toString().toLowerCase();
  if (v.includes('critical') || v.includes('alert')) return 'disruption';
  if (v.includes('warn')) return 'maintenance';
  return 'operational';
};

const buildCitizenCabins = (sensorsStatus, recent) => {
  const lastBySensor = new Map();
  (recent || []).forEach((m) => {
    const sid = m.sensor_id ?? m.sensorId;
    if (!sid) return;
    const prev = lastBySensor.get(sid);
    if (!prev || new Date(m.timestamp) > new Date(prev.timestamp)) {
      lastBySensor.set(sid, m);
    }
  });

  return (sensorsStatus || []).map((s) => {
    const sid = s.sensor_id;
    const last = lastBySensor.get(sid) || {};
    const id = s.cabina_id || `SENSOR-${sid}`;
    return {
      id,
      position: { x: 0, y: 0 },
      velocity: Number(last.velocidad) || 0,
      passengers: 0,
      eta: '-',
      vibrationLast: Number(last.rms) || 0,
      vibrationAvg: Number(last.rms) || 0,
      status: (s.health?.system_status || s.health?.status || 'normal').toLowerCase().includes('critical') ? 'alert' : ((s.health?.system_status || s.health?.status || '').toLowerCase().includes('warn') ? 'warning' : 'normal'),
      statusProcessed: s.health?.system_status || s.health?.status || 'normal',
      isMoving: (Number(last.velocidad) || 0) > 0,
    };
  });
};

const mockStations = [
  { id: 'ST001', name: 'A1', position: { x: 20, y: 80 }, type: 'terminal' },
  { id: 'ST002', name: 'B3', position: { x: 35, y: 65 }, type: 'intermediate' },
  { id: 'ST003', name: 'C7', position: { x: 50, y: 50 }, type: 'intermediate' },
  { id: 'ST004', name: 'D2', position: { x: 65, y: 35 }, type: 'intermediate' },
  { id: 'ST005', name: 'E9', position: { x: 80, y: 20 }, type: 'terminal' }
];

// Función para calcular métricas ciudadanas
const calculateCitizenMetrics = (cabins) => {
  const totalCabins = cabins.length;
  const operationalCabins = cabins.filter(cabin => cabin.status === 'normal').length;
  const efficiency = totalCabins > 0 ? (operationalCabins / totalCabins) * 100 : 100;
  const movingCabins = cabins.filter(cabin => cabin.isMoving).length;
  const waitTime = totalCabins > 0 ? (totalCabins - movingCabins) * 2 : 2;
  const activePassengers = 0;
  return {
    activePassengers,
    waitTime: Math.round(waitTime * 10) / 10,
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

// Función para determinar el estado del sistema desde microservicio
const mapSystemStatus = (system_status) => mapHealthToStatus(system_status);

export const getCitizenDashboard = asyncHandler(async (req, res) => {
  const base = (process.env.ANALYTICS_BASE_URL || ANALYTICS_BASE_URL).replace(/\/$/, '');
  const [healthResp, sensorsResp, recentResp, summaryResp] = await Promise.all([
    fetchJSON(`${base}/analytics/system-health`),
    fetchJSON(`${base}/analytics/sensors/status`),
    fetchJSON(`${base}/data/measurements/recent?limit=500`),
    fetchJSON(`${base}/analytics/summary`),
  ]);

  const systemHealth = healthResp?.data || {};
  const sensors = sensorsResp?.data?.sensors || [];
  const recent = recentResp?.data?.measurements || [];

  const cabins = buildCitizenCabins(sensors, recent);
  const metrics = calculateCitizenMetrics(cabins);
  const systemStatus = mapSystemStatus(systemHealth?.system_status || systemHealth?.status || 'healthy');
  const serviceUpdates = getServiceUpdates();
  const routeInfo = getRouteInfo();

  res.json({
    ok: true,
    data: {
      metrics,
      serviceUpdates,
      routeInfo,
      systemStatus,
      stations: mockStations,
      cabins,
      timestamp: new Date().toISOString(),
    },
  });
});

export default { getCitizenDashboard };
