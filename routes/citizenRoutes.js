// routes/citizenRoutes.js (ESM)
import express from 'express';
import * as citizenController from '../controllers/citizenController.js';

const router = express.Router();

// Dashboard ciudadano (público, no requiere autenticación)
router.get('/dashboard', citizenController.getCitizenDashboard);

export default router;
