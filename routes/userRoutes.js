// routes/userRoutes.js (ESM)
import express from 'express';
const router = express.Router();
import * as userController from '../controllers/userCotroller.js';

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
router.get('/gestion/usuarios', requireAuth, requireRole('administrador'), userController.listUsers);
router.post('/gestion/usuarios', requireAuth, requireRole('administrador'), userController.createUser);

export default router;

/**
 * userRoutes.js (ESM Version)
 * 
 * @description Rutas de usuario con seguridad por roles - Versión mejorada
 * @version 2.0
 * 
 * @requires express
 * @requires ../controllers/userController.js
 * @requires ../middlewares/auth.js
 * 
 * @overview Implementación mejorada que cumple específicamente con los requisitos de seguridad
 *           del documento UrbanFlow. Separa claramente rutas públicas, privadas y de administración.
 * 
 * @security Implementa sistema de roles con middlewares requireAuth y requireRole
 * 
 * @route GET /usuario/mapa-publico
 * @description Ruta pública para acceso al mapa sin autenticación. Cumple RF23.
 * @access Público
 * @returns {Object} Confirmación de acceso público
 * 
 * @route GET /usuario/gestion/usuarios
 * @description Obtiene listado de usuarios. Solo para administradores. Cumple RF1, RF8, RF10.
 * @access Solo administradores
 * @middleware requireAuth, requireRole('administrador')
 * @returns {Array} Lista de usuarios del sistema
 * 
 * @route POST /usuario/gestion/usuarios  
 * @description Crea un nuevo usuario. Solo para administradores. Cumple RF1, RF8, RF10.
 * @access Solo administradores
 * @middleware requireAuth, requireRole('administrador')
 * @body {Object} Datos del nuevo usuario
 * @returns {Object} Usuario creado
 * 
 * @example
 * // Acceso público al mapa:
 * GET /api/usuario/mapa-publico
 * 
 * // Gestión de usuarios (solo admin):
 * GET /api/usuario/gestion/usuarios
 * Headers: { Authorization: Bearer <jwt-token> } // Token de administrador
 * 
 * // Crear usuario (solo admin):
 * POST /api/usuario/gestion/usuarios
 * Headers: { Authorization: Bearer <jwt-token> }
 * Body: {
 *   "nombre": "Carlos Admin",
 *   "email": "carlos@urbanflow.com", 
 *   "password": "securepass",
 *   "rol": "operador"
 * }
 * 
 * @todo Implementar rutas para perfil y dashboard de usuarios autenticados
 * @todo Agregar PUT y DELETE para gestión completa de usuarios
 */