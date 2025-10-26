// controllers/dashboardController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

// Datos desde microservicio (reemplaza mocks)
const ANALYTICS_BASE_URL = process.env.ANALYTICS_BASE_URL || 'http://localhost:8001/api';

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
  // KPIs basados en datos del microservicio
  const avgRms = Number(summary?.rms_promedio ?? systemHealth?.avg_rms ?? 0);
  const alertRate = Number(systemHealth?.alert_rate ?? 0);
  const totalMediciones = Number(summary?.total_mediciones ?? 0);
  const avgVelocity = Number(summary?.velocidad_promedio_kmh ?? 0) / 3.6; // Convertir km/h a m/s
  const distanciaTotal = Number(summary?.distancia_total_km ?? 0);
  
  // Calcular métricas adicionales desde datos recientes
  const recentData = Array.isArray(recent) ? recent : [];
  const avgKurtosis = recentData.length > 0 
    ? recentData.reduce((s, m) => s + (Number(m.kurtosis) || 0), 0) / recentData.length 
    : 0;
  const avgSkewness = recentData.length > 0 
    ? recentData.reduce((s, m) => s + (Number(m.skewness) || 0), 0) / recentData.length 
    : 0;
  const avgCrestFactor = recentData.length > 0 
    ? recentData.reduce((s, m) => s + (Number(m.crest_factor) || 0), 0) / recentData.length 
    : 0;
  const maxPico = recentData.length > 0 
    ? Math.max(...recentData.map(m => Number(m.pico) || 0)) 
    : 0;
  
  // Distribución de estados operativos
  const estadosDistribucion = summary?.distribucion_estados || {};
  const estadoMasComun = Object.keys(estadosDistribucion).reduce((a, b) => 
    estadosDistribucion[a]?.count > estadosDistribucion[b]?.count ? a : b, 'desconocido'
  );
  
  return [
    { 
      id: 'kpi1', 
      title: 'RMS Promedio', 
      value: avgRms.toFixed(3), 
      change: 0, 
      status: avgRms > 1.5 ? 'warning' : 'neutral',
      description: 'Root Mean Square de vibración'
    },
    { 
      id: 'kpi2', 
      title: 'Total Mediciones', 
      value: totalMediciones.toString(), 
      change: 0, 
      status: 'neutral',
      description: 'Registros procesados'
    },
    { 
      id: 'kpi3', 
      title: 'Velocidad Promedio', 
      value: `${avgVelocity.toFixed(1)} m/s`, 
      change: 0, 
      status: 'neutral',
      description: 'Velocidad promedio del sistema'
    },
    { 
      id: 'kpi4', 
      title: 'Distancia Total', 
      value: `${distanciaTotal.toFixed(1)} km`, 
      change: 0, 
      status: 'neutral',
      description: 'Longitud total del recorrido'
    },
    { 
      id: 'kpi5', 
      title: 'Kurtosis Promedio', 
      value: avgKurtosis.toFixed(3), 
      change: 0, 
      status: 'neutral',
      description: 'Curtosis de vibración'
    },
    { 
      id: 'kpi6', 
      title: 'Crest Factor', 
      value: avgCrestFactor.toFixed(2), 
      change: 0, 
      status: avgCrestFactor > 4 ? 'warning' : 'neutral',
      description: 'Factor de cresta promedio'
    },
    { 
      id: 'kpi7', 
      title: 'Pico Máximo', 
      value: maxPico.toFixed(3), 
      change: 0, 
      status: maxPico > 3 ? 'warning' : 'neutral',
      description: 'Valor pico máximo registrado'
    },
    { 
      id: 'kpi8', 
      title: 'Estado Dominante', 
      value: estadoMasComun, 
      change: 0, 
      status: 'neutral',
      description: 'Estado operativo más común'
    }
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
  
  console.log('Debug buildVibrationSeries:');
  console.log('- recent data length:', recent?.length || 0);
  console.log('- cabins length:', cabins?.length || 0);
  console.log('- sensorToCabin map:', Array.from(sensorToCabin.entries()));
  
  const series = (recent || []).slice(0, 500).map((m) => {
    const mappedId = sensorToCabin.get(Number(m.sensor_id));
    const cabId = mappedId || String(`SENSOR-${m.sensor_id}`);
    const timestamp = new Date(m.timestamp);
    
    return {
      time: timestamp.toTimeString().slice(0,5),
      timestamp: timestamp.toISOString(),
      vibration: Number(m.rms) || 0,
      kurtosis: Number(m.kurtosis) || 0,
      skewness: Number(m.skewness) || 0,
      pico: Number(m.pico) || 0,
      crest_factor: Number(m.crest_factor) || 0,
      zcr: Number(m.zcr) || 0,
      frecuencia_media: Number(m.frecuencia_media) || 0,
      frecuencia_dominante: Number(m.frecuencia_dominante) || 0,
      amplitud_max_espectral: Number(m.amplitud_max_espectral) || 0,
      energia_banda_1: Number(m.energia_banda_1) || 0,
      energia_banda_2: Number(m.energia_banda_2) || 0,
      energia_banda_3: Number(m.energia_banda_3) || 0,
      estado_procesado: m.estado_procesado || 'desconocido',
      cabinId: cabId,
    };
  });
  
  console.log('- series length:', series.length);
  console.log('- first series item:', series[0]);
  
  return series;
};

export const main = asyncHandler(async (req, res) => {
  const base = ANALYTICS_BASE_URL.replace(/\/$/, '');
  
  // Intentar obtener datos del microservicio, con fallback a datos por defecto
  let summaryResp, healthResp, sensorsResp, recentResp, cabinsResp;
  
  try {
    [summaryResp, healthResp, sensorsResp, recentResp, cabinsResp] = await Promise.all([
      fetchJSON(`${base}/analytics/summary`).catch(() => ({ data: {} })),
      fetchJSON(`${base}/analytics/system-health`).catch(() => ({ data: { status: 'no_data' } })),
      fetchJSON(`${base}/analytics/sensors/status`).catch(() => ({ data: { sensors: [] } })),
      fetchJSON(`${base}/data/measurements/recent?limit=500`).catch(() => ({ data: { measurements: [] } })),
      fetchJSON(`${base}/analytics/cabins/summary`).catch(() => ({ data: { cabins: [] } })),
    ]);
  } catch (error) {
    console.log('Error conectando al microservicio de analítica:', error.message);
    // Usar datos por defecto si el microservicio no está disponible
    summaryResp = { data: {} };
    healthResp = { data: { status: 'no_data' } };
    sensorsResp = { data: { sensors: [] } };
    recentResp = { data: { measurements: [] } };
    cabinsResp = { data: { cabins: [] } };
  }

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
  
  // historicalData basado en mediciones recientes unidas a cabina (limitado a 50 registros para la tabla)
  const sensorToCabin = new Map();
  cabins.forEach(c => { if (c.sensor_id) sensorToCabin.set(Number(c.sensor_id), String(c.id)); });
  const historicalData = (recent || []).slice(0, 50).map(m => ({
    cabinId: sensorToCabin.get(Number(m.sensor_id)) || String(`SENSOR-${m.sensor_id}`),
    timestamp: new Date(m.timestamp).toISOString().slice(0,16).replace('T',' '),
    position: { x: 0, y: 0 },
    velocity: Number(m.velocidad) || 0,
    vibration: Number(m.rms) || 0,
    kurtosis: Number(m.kurtosis) || 0,
    skewness: Number(m.skewness) || 0,
    pico: Number(m.pico) || 0,
    crest_factor: Number(m.crest_factor) || 0,
    estado_procesado: m.estado_procesado || 'desconocido',
    status: (cabins.find(c => c.sensor_id === m.sensor_id)?.status) || 'normal',
  }));

  res.json({
    ok: true,
    data: {
      kpis,
      vibrationSeries,
      cabins,
      historicalData,
      availableCabins: cabins.map(c => ({
        id: c.id,
        codigo: c.id,
        estado: c.statusProcessed,
        sensor_id: c.sensor_id
      })),
      user: req.user,
      timestamp: new Date().toISOString(),
    },
  });
});

export const getCabinHistory = asyncHandler(async (req, res) => {
  const { cabinId } = req.params;
  const { limit = 50 } = req.query;
  
  const base = ANALYTICS_BASE_URL.replace(/\/$/, '');
  
  try {
    // Obtener datos del microservicio
    const [recentResp, cabinsResp] = await Promise.all([
      fetch(`${base}/data/measurements/recent?limit=${limit}`).catch(() => ({ data: { measurements: [] } })),
      fetch(`${base}/analytics/cabins/summary`).catch(() => ({ data: { cabins: [] } })),
    ]);
    
    const recent = recentResp?.data?.measurements || [];
    const cabinsSummary = cabinsResp?.data?.cabins || [];
    
    // Mapear sensores a cabinas
    const sensorToCabin = new Map();
    cabinsSummary.forEach(c => { 
      if (c.sensor_id) sensorToCabin.set(Number(c.sensor_id), String(c.codigo_interno || c.cabina_id)); 
    });
    
    // Filtrar por cabina seleccionada si se especifica
    let filteredData = recent;
    if (cabinId && cabinId !== 'all') {
      const targetSensorId = Array.from(sensorToCabin.entries())
        .find(([sensorId, cabId]) => cabId === cabinId)?.[0];
      
      if (targetSensorId) {
        filteredData = recent.filter(m => Number(m.sensor_id) === targetSensorId);
      }
    }
    
    // Construir historial
    const historicalData = filteredData.slice(0, parseInt(limit)).map(m => ({
      cabinId: sensorToCabin.get(Number(m.sensor_id)) || String(`SENSOR-${m.sensor_id}`),
      timestamp: new Date(m.timestamp).toISOString().slice(0,16).replace('T',' '),
      position: { x: 0, y: 0 },
      velocity: Number(m.velocidad) || 0,
      vibration: Number(m.rms) || 0,
      kurtosis: Number(m.kurtosis) || 0,
      skewness: Number(m.skewness) || 0,
      pico: Number(m.pico) || 0,
      crest_factor: Number(m.crest_factor) || 0,
      estado_procesado: m.estado_procesado || 'desconocido',
      status: 'normal',
    }));
    
    res.json({
      ok: true,
      data: {
        historicalData,
        totalRecords: filteredData.length,
        selectedCabin: cabinId || 'all'
      }
    });
    
  } catch (error) {
    res.json({
      ok: false,
      error: error.message,
      data: { historicalData: [], totalRecords: 0 }
    });
  }
});

export default { main, getCabinHistory };
