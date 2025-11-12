// routes/publicRoutes.js
import express from 'express';
import * as publicController from '../controllers/publicController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// @route   GET /api/map/public
// @desc    Obtiene los datos públicos para el mapa (estaciones, cabinas activas).
// @access  Public
router.get('/public', publicController.publicMap);

// @route   GET /api/map/private
// @desc    Obtiene datos detallados para roles autorizados.
// @access  Autenticado (admin, operador, analista)
router.get(
  '/private',
  requireAuth,
  requireRole('admin', 'operador', 'analista'),
  publicController.privateMap,
);

export default router;