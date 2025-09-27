import express from 'express';
import { login, me, logout, refresh } from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

// Rutas públicas (no requieren autenticación)
router.post('/login', login);
router.post('/refresh', refresh);

// Rutas protegidas (requieren autenticación)
router.get('/me', auth, me);
router.post('/logout', auth, logout);

export default router;
