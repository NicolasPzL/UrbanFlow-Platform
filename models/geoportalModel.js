// models/geoportalModel.js
import pool from '../config/db.js';

const mapDecimal = (value) => (value === null || value === undefined ? null : Number(value));

const normalizeStationRow = (row) => ({
  ...row,
  latitud: mapDecimal(row.latitud),
  longitud: mapDecimal(row.longitud),
});

const normalizeCabinRow = (row) => ({
  cabina_id: row.cabina_id,
  codigo_interno: row.codigo_interno,
  estado_actual: row.estado_actual,
  status: row.status ?? 'unknown',
  sensor_id: row.sensor_id ?? null,
  latitud: mapDecimal(row.latitud),
  longitud: mapDecimal(row.longitud),
  altitud: mapDecimal(row.altitud),
  velocidad: mapDecimal(row.velocidad),
  rms: mapDecimal(row.rms),
  estado_procesado: row.estado_procesado ?? null,
  last_timestamp: row.last_timestamp ? new Date(row.last_timestamp).toISOString() : null,
});

const computeStats = (cabins) => {
  const activeCabins = cabins.length;
  const velocities = cabins
    .map((cabin) => cabin.velocidad)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));

  const avgVelocity = velocities.length
    ? Number((velocities.reduce((acc, value) => acc + value, 0) / velocities.length).toFixed(2))
    : null;

  const lastUpdate = cabins.reduce((latest, cabin) => {
    if (!cabin.last_timestamp) return latest;
    const current = new Date(cabin.last_timestamp).getTime();
    if (!latest) return current;
    return current > latest ? current : latest;
  }, null);

  const hasAlert = cabins.some((cabin) => cabin.status === 'alert');
  const hasWarning = cabins.some((cabin) => cabin.status === 'warning');

  const systemStatus = hasAlert
    ? { level: 'alert', label: 'Crítico' }
    : hasWarning
      ? { level: 'warning', label: 'En vigilancia' }
      : cabins.length > 0
        ? { level: 'normal', label: 'Operativo' }
        : { level: 'unknown', label: 'Sin datos' };

  return {
    activeCabins,
    avgVelocity,
    totalPassengers: null,
    avgETA: null,
    lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
    systemStatus,
  };
};

export const getGeoportalData = async () => {
  try {
    const stationsQuery = `
      SELECT estacion_id, nombre, tipo, latitud, longitud
      FROM estaciones
      WHERE estado_operativo = $1
    `;
    const stationsResult = await pool.query(stationsQuery, ['operativa']);

    const cabinsQuery = `
      SELECT DISTINCT ON (c.cabina_id)
        c.cabina_id,
        c.codigo_interno,
        c.estado_actual,
        CASE
          WHEN c.estado_actual IN ('operativo', 'operativa') THEN 'normal'
          WHEN c.estado_actual = 'inusual' THEN 'warning'
          WHEN c.estado_actual = 'alerta' THEN 'alert'
          ELSE 'unknown'
        END AS status,
        s.sensor_id,
        COALESCE(m.latitud, tc.lat) AS latitud,
        COALESCE(m.longitud, tc.lon) AS longitud,
        COALESCE(m.altitud, tc.alt) AS altitud,
        COALESCE(m.velocidad, tc.velocidad_ms) AS velocidad,
        m.rms,
        m.estado_procesado,
        COALESCE(m.timestamp, tc.last_timestamp) AS last_timestamp
      FROM public.cabinas c
      JOIN public.sensores s ON c.cabina_id = s.cabina_id
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.mediciones m
        WHERE m.sensor_id = s.sensor_id
        ORDER BY m.timestamp DESC
        LIMIT 1
      ) m ON true
      LEFT JOIN LATERAL (
        SELECT
          tc.lat,
          tc.lon,
          tc.alt,
          CASE
            WHEN tc.velocidad_kmh IS NULL THEN NULL
            ELSE tc.velocidad_kmh / 3.6
          END AS velocidad_ms,
          tc.timestamp AS last_timestamp
        FROM public.telemetria_cruda tc
        WHERE tc.sensor_id = s.sensor_id
        ORDER BY tc.timestamp DESC
        LIMIT 1
      ) tc ON true
      WHERE c.estado_actual IN ('operativo', 'operativa', 'inusual', 'alerta')
      ORDER BY c.cabina_id, last_timestamp DESC NULLS LAST;
    `;

    const cabinsResult = await pool.query(cabinsQuery);
    const cabins = cabinsResult.rows.map(normalizeCabinRow);

    const stations = stationsResult.rows.map(normalizeStationRow);

    return {
      stations,
      cabins,
      stats: computeStats(cabins),
    };
  } catch (error) {
    console.error('Error en geoportalModel.getGeoportalData:', error);
    throw new Error('Error al consultar los datos del geoportal.');
  }
};

export const getCitizenMapData = async () => {
  const { stations, cabins, stats } = await getGeoportalData();

  const cabinSummaries = cabins.map((cabin) => ({
    cabina_id: cabin.cabina_id,
    codigo_interno: cabin.codigo_interno,
    estado_actual: cabin.estado_actual,
    status: cabin.status,
    latitud: cabin.latitud,
    longitud: cabin.longitud,
    velocidad: cabin.velocidad,
    last_update: cabin.last_timestamp,
  }));

  return {
    stations,
    cabins: cabinSummaries,
    stats,
  };
};

export const getPrivilegedMapData = async () => {
  const { stations, cabins, stats } = await getGeoportalData();

  const detailedCabins = cabins.map((cabin) => ({
    cabina_id: cabin.cabina_id,
    codigo_interno: cabin.codigo_interno,
    estado_actual: cabin.estado_actual,
    status: cabin.status,
    latitud: cabin.latitud,
    longitud: cabin.longitud,
    velocidad: cabin.velocidad,
    altitud: cabin.altitud,
    rms: cabin.rms,
    sensor_id: cabin.sensor_id,
    estado_procesado: cabin.estado_procesado,
    last_update: cabin.last_timestamp,
  }));

  return {
    stations,
    cabins: detailedCabins,
    stats,
  };
};