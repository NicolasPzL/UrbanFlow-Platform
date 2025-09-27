// controllers/dashboardController.js
import { asyncHandler } from '../middlewares/asyncHandler.js';

export const main = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    data: {
      message: 'Dashboard endpoint - implementar lógica de analytics',
      user: req.user,
      timestamp: new Date().toISOString(),
    },
  });
});

export default { main };
