import { Router } from 'express';
import AuthController from '../controllers/authController';
import { validateLogin, validateRegistration } from '../middlewares/validations/authValidation';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validateRegistration, async (req, res, next) => {
    try {
        const user = await authController.register(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', validateLogin, async (req, res, next) => {
    try {
        const token = await authController.login(req.body);
        res.status(200).json({ token });
    } catch (error) {
        next(error);
    }
});

export default router;

/**
 * authRoute.js
 * 
 * @description Rutas de autenticación para la plataforma UrbanFlow
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/authController
 * @requires ../middlewares/validations/authValidation
 * 
 * @route POST /auth/register
 * @description Registra un nuevo usuario en el sistema. Según RF1, solo administradores 
 *              deberían poder registrar usuarios, pero esta implementación actual permite 
 *              registro público (debe revisarse según requisitos finales).
 * @access Público
 * @middleware validateRegistration - Valida email, contraseña, nombre, etc.
 * @returns {Object} Usuario creado (sin contraseña)
 * 
 * @route POST /auth/login  
 * @description Autentica un usuario y genera token JWT para acceso a rutas protegidas.
 *              Implementa RF5 (login con verificación de credenciales) y RF6 (JWT).
 * @access Público
 * @middleware validateLogin - Valida formato de credenciales
 * @returns {Object} Token JWT para autenticación
 * 
 * @example
 * // Registro de usuario:
 * POST /auth/register
 * Body: { "nombre": "Juan", "email": "juan@email.com", "password": "123456", "rol": "usuario" }
 * 
 * // Login de usuario:
 * POST /auth/login  
 * Body: { "email": "juan@email.com", "password": "123456" }
 * Response: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
 * Nota importante: Según el requisito RF1 del documento, el registro de nuevos usuarios debería estar restringido solo a administradores. La implementación actual permite registro público, lo que podría necesitar ajustarse según los requisitos de seguridad finales.
 */