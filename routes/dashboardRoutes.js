// routes/dashboardRoutes.js (ESM)
import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

// Dashboard principal (requiere auth, se montará con requireAuth en app.js)
router.get('/', dashboardController.main);

export default router;
