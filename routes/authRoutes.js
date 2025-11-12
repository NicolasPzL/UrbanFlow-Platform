import express from 'express';
import { login, me, logout, changePassword, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validateLogin, validateChangePassword, validateForgotPassword, validateResetPassword } from '../validators/authValidator.js';
import auth from '../middlewares/auth.js';

const router = express.Router();
const { requireAuth } = auth;

// Rutas públicas (no requieren autenticación)
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

// Rutas protegidas (requieren autenticación)
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);
router.put('/change-password', requireAuth, validateChangePassword, changePassword);

export default router;
