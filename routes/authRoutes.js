import express from 'express';
import { login, me, logout } from '../controllers/authController.js';
import { validateLogin } from '../validators/authValidator.js';
import auth from '../middlewares/auth.js';

const router = express.Router();
const { requireAuth } = auth;

// Rutas públicas (no requieren autenticación)
router.post('/login', validateLogin, login);

// Rutas protegidas (requieren autenticación)
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

export default router;
