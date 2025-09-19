// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Importamos nuestros middlewares
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// --- Rutas Públicas (sin guardias) ---
router.post('/login', userController.login);
router.get('/mapa-publico', userController.getPublicMap); // El mapa público no requiere autenticación [cite: 214, 267]

// --- Rutas Privadas (solo para usuarios autenticados) ---
// Se aplica el guardia `verifyToken`
router.get('/perfil', verifyToken, userController.getProfile);
router.get('/dashboard', verifyToken, userController.getDashboard); // El dashboard requiere autenticación [cite: 209]

// --- Rutas de Administrador (seguridad VIP) ---
// Se aplican ambos guardias en orden: primero `verifyToken`, luego `isAdmin`
router.get('/gestion/usuarios', verifyToken, isAdmin, userController.getAllUsers); // La gestión de usuarios es solo para admins [cite: 210]
router.post('/gestion/usuarios', verifyToken, isAdmin, userController.createUser);

module.exports = router;