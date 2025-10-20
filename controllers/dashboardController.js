// controllers/dashboardController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

// Datos desde microservicio (reemplaza mocks)
const ANALYTICS_BASE_URL = process.env.ANALYTICS_BASE_URL || 'http://localhost:8080/api';

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Request failed ${r.status} ${url}`);
  return r.json();
};

const mapHealthToStatus = (health) => {
  const s = (health?.system_status || health?.status || '').toString().toLowerCase();
  if (s.includes('critical') || s.includes('alert')) return 'alert';
  if (s.includes('warn')) return 'warning';
  return 'normal';
};

const buildKPIs = (summary, systemHealth, recent) => {
  const avgRms = Number(systemHealth?.avg_rms ?? 0);
  const alertRate = Number(systemHealth?.alert_rate ?? 0);
  const total = Array.isArray(recent) ? recent.length : 0;
  const avgVelocity = Array.isArray(recent) && recent.length
    ? recent.reduce((s, m) => s + (Number(m.velocidad) || 0), 0) / recent.length
    : 0;
  return [
    { id: 'kpi1', title: 'RMS Promedio', value: avgRms.toFixed(3), change: 0, status: 'neutral' },
    { id: 'kpi2', title: '% Cabinas en Alerta', value: `${Math.round(alertRate * 100)}%`, change: 0, status: 'neutral' },
    { id: 'kpi3', title: 'Pasajeros/Hora', value: '—', change: 0, status: 'neutral' },
    { id: 'kpi4', title: 'Velocidad Promedio', value: `${avgVelocity.toFixed(1)} m/s`, change: 0, status: 'neutral' },
  ];
};

const buildCabins = (sensorsStatus, recent) => {
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
    const id = String(s.cabina_id || `SENSOR-${sid}`);
    return {
      id,
      position: { x: 0, y: 0 },
      velocity: Number(last.velocidad) || 0,
      passengers: 0,
      eta: '-',
      vibrationLast: Number(last.rms) || 0,
      vibrationAvg: Number(last.rms) || 0,
      status: mapHealthToStatus(s.health),
      statusProcessed: s.health?.system_status || s.health?.status || 'normal',
      isMoving: (Number(last.velocidad) || 0) > 0,
    };
  });
};

const buildVibrationSeries = (recent, cabins) => {
  // Build sensor->cabinId map from provided cabins
  const sensorToCabin = new Map();
  (cabins || []).forEach(c => {
    if (c.sensor_id) sensorToCabin.set(Number(c.sensor_id), String(c.id));
  });
  const series = (recent || []).slice(0, 500).map((m) => {
    const mappedId = sensorToCabin.get(Number(m.sensor_id));
    const cabId = mappedId || String(`SENSOR-${m.sensor_id}`);
    return {
      time: new Date(m.timestamp).toTimeString().slice(0,5),
      vibration: Number(m.rms) || 0,
      cabinId: cabId,
    };
  });
  return series;
};

export const main = asyncHandler(async (req, res) => {
  const base = ANALYTICS_BASE_URL.replace(/\/$/, '');
  const [summaryResp, healthResp, sensorsResp, recentResp, cabinsResp] = await Promise.all([
    fetchJSON(`${base}/analytics/summary`),
    fetchJSON(`${base}/analytics/system-health`),
    fetchJSON(`${base}/analytics/sensors/status`),
    fetchJSON(`${base}/data/measurements/recent?limit=500`),
    fetchJSON(`${base}/analytics/cabins/summary`),
  ]);

  const summary = summaryResp?.data || {};
  const systemHealth = healthResp?.data || {};
  const sensors = sensorsResp?.data?.sensors || [];
  const recent = recentResp?.data?.measurements || [];
  const cabinsSummary = cabinsResp?.data?.cabins || [];

  // Preferir lista completa de cabinas desde microservicio
  let cabins = [];
  if (Array.isArray(cabinsSummary) && cabinsSummary.length) {
    const mapEstado = (estadoRaw) => {
      const e = (estadoRaw || '').toString().toLowerCase();
      if (e.includes('fuera') || e.includes('fall') || e.includes('crit')) return 'alert';
      if (e.includes('manten') || e.includes('warn')) return 'warning';
      return 'normal';
    };
    cabins = cabinsSummary.map((c) => ({
      id: String(c.codigo_interno || c.cabina_id),
      sensor_id: c.sensor_id ?? null,
      position: { x: Number(c.latest?.longitud) || 0, y: Number(c.latest?.latitud) || 0 },
      velocity: Number(c.latest?.velocidad) || 0,
      passengers: 0,
      eta: '-',
      vibrationLast: Number(c.latest?.rms) || 0,
      vibrationAvg: Number(c.latest?.rms) || 0,
      status: mapEstado(c.estado_actual),
      statusProcessed: c.estado_actual || 'normal',
      isMoving: (Number(c.latest?.velocidad) || 0) > 0,
    }));
  } else {
    cabins = buildCabins(sensors, recent);
  }
  const kpis = buildKPIs(summary, systemHealth, recent);
  const vibrationSeries = buildVibrationSeries(recent, cabins);
  const passengersSeries = [];
  // historicalData basado en mediciones recientes unidas a cabina
  const sensorToCabin = new Map();
  cabins.forEach(c => { if (c.sensor_id) sensorToCabin.set(Number(c.sensor_id), String(c.id)); });
  const historicalData = (recent || []).slice(0, 500).map(m => ({
    cabinId: sensorToCabin.get(Number(m.sensor_id)) || String(`SENSOR-${m.sensor_id}`),
    timestamp: new Date(m.timestamp).toISOString().slice(0,16).replace('T',' '),
    position: { x: 0, y: 0 },
    velocity: Number(m.velocidad) || 0,
    vibration: Number(m.rms) || 0,
    passengers: 0,
    status: (cabins.find(c => c.sensor_id === m.sensor_id)?.status) || 'normal',
  }));

  res.json({
    ok: true,
    data: {
      kpis,
      vibrationSeries,
      passengersSeries,
      cabins,
      historicalData,
      user: req.user,
      timestamp: new Date().toISOString(),
    },
  });
});

export default { main };
