// routes/publicRoutes.js
import express from 'express';
import * as publicController from '../controllers/publicController.js';

const router = express.Router();

// @route   GET /api/map/public
// @desc    Obtiene los datos públicos para el mapa (estaciones, cabinas activas).
// @access  Public
router.get('/public', publicController.publicMap);

export default router;