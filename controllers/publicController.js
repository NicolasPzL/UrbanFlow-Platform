// controllers/publicController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getPublicData } from '../models/geoportalModel.js';

export const publicMap = asyncHandler(async (_req, res, next) => {
  // Llamamos al modelo para obtener los datos reales de la base de datos.
  const mapData = await getPublicData();

  // Usamos los datos reales para construir la respuesta.
  const data = {
    message: 'Datos del geoportal público cargados exitosamente.',
    timestamp: new Date().toISOString(),
    stations: mapData.stations, // Dato real desde la BD
    cabins: mapData.cabins,     // Dato real desde la BD
    stats: {
      activeCabins: mapData.cabins.length, // Conteo real de cabinas
      totalPassengers: 0, // Placeholder
      avgETA: '--:--',      // Placeholder
      lastUpdate: new Date().toISOString(),
    },
  };

  // Enviamos la respuesta con el formato que ya usas.
  res.json({ ok: true, data });
});

export default { publicMap };
