// routes/userRoutes.js (ESM)
import express from 'express';
const router = express.Router();
import * as userController from '../controllers/userController.js';

// Importamos nuestros middlewares
import { requireAuth, requireRole } from '../middlewares/auth.js';

// --- Rutas Públicas (sin guardias) ---
// No mover login aquí: login vive en authController en app.js actualmente
// router.post('/login', ...)
// Ruta pública de ejemplo
router.get('/mapa-publico', (req, res) => res.json({ ok: true }));

// --- Rutas Privadas (solo para usuarios autenticados) ---
// Se aplica el guardia `verifyToken`
// Estas rutas no existen en user controller actual; se omiten
// router.get('/perfil', requireAuth, ...)
// router.get('/dashboard', requireAuth, ...)

// --- Rutas de Administrador (seguridad VIP) ---
// Se aplican ambos guardias en orden: primero `verifyToken`, luego `isAdmin`
router.get('/gestion/usuarios', requireAuth, requireRole('admin'), userController.listUsers);
router.post('/gestion/usuarios', requireAuth, requireRole('admin'), userController.createUser);

export default router;