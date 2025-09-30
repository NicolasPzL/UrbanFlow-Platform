// controllers/publicController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

export const publicMap = asyncHandler(async (_req, res) => {
  res.json({
    ok: true,
    data: {
      message: 'Mapa público - implementar datos de estaciones y rutas',
      timestamp: new Date().toISOString(),
    },
  });
});

export default { publicMap };
