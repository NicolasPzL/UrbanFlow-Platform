// models/geoportalModel.js
import pool from '../config/db.js'; // Asegúrate que la ruta a tu archivo de BD sea correcta.

/**
 * Obtiene los datos públicos para el geoportal desde la base de datos.
 * @returns {Promise<{stations: any[], cabins: any[]}>} Un objeto con las estaciones y las cabinas.
 */
export const getPublicData = async () => {
  try {
    // Consulta para las estaciones operativas
    const stationsQuery = 'SELECT estacion_id, nombre, tipo, latitud, longitud FROM estaciones WHERE estado_operativo = $1';
    const stationsResult = await pool.query(stationsQuery, ['operativa']);

    // Consulta eficiente para la última ubicación de cada cabina activa
    const cabinsQuery = `
      SELECT DISTINCT ON (c.cabina_id)
        c.cabina_id,
        c.codigo_interno,
        c.estado_actual,
        CASE 
          WHEN c.estado_actual = 'operativo' THEN 'normal'
          WHEN c.estado_actual = 'inusual' THEN 'warning'
          WHEN c.estado_actual = 'alerta' THEN 'alert'
          ELSE 'normal'
        END as status,
        m.latitud,
        m.longitud,
        m.velocidad,
        m.timestamp
      FROM public.cabinas c
      JOIN public.sensores s ON c.cabina_id = s.cabina_id
      JOIN public.mediciones m ON s.sensor_id = m.sensor_id
      WHERE c.estado_actual IN ('operativo', 'inusual', 'alerta')
      ORDER BY c.cabina_id, m.timestamp DESC;
    `;
    const cabinsResult = await pool.query(cabinsQuery);

    // Devuelve los resultados
    return {
      stations: stationsResult.rows,
      cabins: cabinsResult.rows,
    };
  } catch (error) {
    console.error('Error en geoportalModel.getPublicData:', error);
    throw new Error('Error al consultar los datos del geoportal.');
  }
};