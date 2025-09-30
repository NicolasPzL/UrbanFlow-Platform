// routes/publicRoutes.js (ESM)
import express from 'express';
import * as publicController from '../controllers/publicController.js';

const router = express.Router();

// Mapa público
router.get('/public', publicController.publicMap);

export default router;
