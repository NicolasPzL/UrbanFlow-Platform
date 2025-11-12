import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getCitizenMapData, getPrivilegedMapData } from '../models/geoportalModel.js';

export const publicMap = asyncHandler(async (_req, res) => {
  const { stations, cabins, stats } = await getCitizenMapData();

  res.json({
    ok: true,
    data: {
      message: 'Datos del geoportal público cargados exitosamente.',
      timestamp: new Date().toISOString(),
      stations,
      cabins,
      stats,
    },
  });
});

export const privateMap = asyncHandler(async (_req, res) => {
  const { stations, cabins, stats } = await getPrivilegedMapData();

  res.json({
    ok: true,
    data: {
      message: 'Datos detallados del geoportal cargados exitosamente.',
      timestamp: new Date().toISOString(),
      stations,
      cabins,
      stats,
    },
  });
});

export default { publicMap, privateMap };
