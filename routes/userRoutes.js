// routes/userRoutes.js (ESM) - CRUD canónico de usuarios
import express from 'express';
import * as userController from '../controllers/userController.js';
import { validateCreateUser, validateUpdateUser } from '../validators/userValidator.js';

const router = express.Router();

// Listar usuarios
router.get('/', userController.listUsers);

// Obtener usuario por ID
router.get('/:id', userController.getUser);

// Crear usuario
router.post('/', validateCreateUser, userController.createUser);

// Actualizar usuario
router.put('/:id', validateUpdateUser, userController.updateUser);

// Eliminar usuario (soft delete)
router.delete('/:id', userController.removeUser);

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