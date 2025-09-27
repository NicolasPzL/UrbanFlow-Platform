import { Router } from 'express';
import { userController } from '../controllers';
import { validateUser, validateUserId } from '../middlewares/validations/userValidation';
import authenticate from '../middlewares/auth';

const router = Router();

/**
 * @route GET /users
 * @desc Get all users
 * @access Private
 */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const users = await userController.getUsers();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /users/:id
 * @desc Get a user by ID
 * @access Private
 */
router.get('/:id', authenticate, validateUserId, async (req, res, next) => {
    try {
        const user = await userController.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /users
 * @desc Create a new user
 * @access Private
 */
router.post('/', authenticate, validateUser, async (req, res, next) => {
    try {
        const user = await userController.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /users/:id
 * @desc Update a user by ID
 * @access Private
 */
router.put('/:id', authenticate, validateUserId, validateUser, async (req, res, next) => {
    try {
        const updatedUser = await userController.updateUser(req.params.id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
});

/**
 * @route DELETE /users/:id
 * @desc Delete a user by ID
 * @access Private
 */
router.delete('/:id', authenticate, validateUserId, async (req, res, next) => {
    try {
        const deletedUser = await userController.deleteUser(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;

/**
 * userRoute.js
 * 
 * @description Rutas CRUD completas y seguras para la gestión de usuarios de UrbanFlow
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/userController
 * @requires ../middlewares/auth
 * @requires ../middlewares/validations/userValidation
 * 
 * @overview Sistema completo de gestión de usuarios con autenticación JWT y validaciones.
 *           Implementa los requisitos RF5, RF6 y RF7 del documento técnico.
 * 
 * @security Todas las rutas requieren autenticación JWT via middleware 'authenticate'
 * 
 * @route GET /usuarios/
 * @description Obtiene el listado completo de todos los usuarios registrados en el sistema.
 * @access Privado (debería restringirse a administradores según RF8)
 * @middleware authenticate - Verifica token JWT válido
 * @returns {Array} Lista de todos los usuarios (sin contraseñas)
 * 
 * @route GET /usuarios/:id
 * @description Obtiene un usuario específico por su ID único.
 * @access Privado (usuario propio o administrador)
 * @middleware authenticate, validateUserId
 * @param {string} id - ID del usuario a consultar
 * @returns {Object} Datos del usuario (sin información sensible)
 * 
 * @route POST /usuarios/
 * @description Crea un nuevo usuario en el sistema. 
 * @access Privado (debería restringirse a administradores según RF1)
 * @middleware authenticate, validateUser
 * @body {Object} User - Datos del nuevo usuario
 * @returns {Object} Usuario creado (sin contraseña)
 * 
 * @route PUT /usuarios/:id
 * @description Actualiza la información de un usuario existente.
 * @access Privado (usuario propio o administrador)
 * @middleware authenticate, validateUserId, validateUser
 * @param {string} id - ID del usuario a actualizar
 * @body {Object} User - Datos actualizados del usuario
 * @returns {Object} Usuario actualizado
 * 
 * @route DELETE /usuarios/:id
 * @description Elimina un usuario del sistema.
 * @access Privado (debería restringirse a administradores según RF3)
 * @middleware authenticate, validateUserId
 * @param {string} id - ID del usuario a eliminar
 * @returns {204} No content - Eliminación exitosa
 * 
 * @example
 * // Obtener todos los usuarios (admin):
 * GET /api/usuarios/
 * Headers: { Authorization: Bearer <jwt-token> }
 * 
 * // Obtener usuario específico:
 * GET /api/usuarios/507f1f77bcf86cd799439011
 * Headers: { Authorization: Bearer <jwt-token> }
 * 
 * // Crear nuevo usuario (admin):
 * POST /api/usuarios/
 * Headers: { Authorization: Bearer <jwt-token> }
 * Body: {
 *   "nombre": "Maria Gonzalez",
 *   "email": "maria@urbanflow.com",
 *   "password": "securepassword",
 *   "rol": "operador"
 * }
 * 
 * // Actualizar usuario:
 * PUT /api/usuarios/507f1f77bcf86cd799439011
 * Headers: { Authorization: Bearer <jwt-token> }
 * Body: {
 *   "nombre": "Maria Gonzalez Updated",
 *   "email": "maria.updated@urbanflow.com"
 * }
 */