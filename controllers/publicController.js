// controllers/publicController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

export const publicMap = asyncHandler(async (_req, res) => {
  // Placeholder hasta conectar con fuentes reales
  const data = {
    message: 'Mapa público',
    timestamp: new Date().toISOString(),
    stations: [], // TODO: poblar desde BD
    cabins: [], // TODO: poblar desde sensores/BD
    stats: {
      activeCabins: 0,
      totalPassengers: 0,
      avgETA: '--:--',
    },
  };
  res.json({ ok: true, data });
});

export default { publicMap };
