// middlewares/validation.js
import { body, param, validationResult } from 'express-validator';

/**
 * Middleware para validar datos de usuario
 * Valida: nombre, correo, contraseña, rol
 */
export const validateUser = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('correo')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un correo electrónico válido')
    .isLength({ max: 100 })
    .withMessage('El correo no puede exceder 100 caracteres'),
  
  body('contrasena')
    .isLength({ min: 6, max: 255 })
    .withMessage('La contraseña debe tener entre 6 y 255 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('rol')
    .optional()
    .isIn(['administrador', 'usuario'])
    .withMessage('El rol debe ser "administrador" o "usuario"'),
  
  // Middleware que procesa los errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          }))
        }
      });
    }
    next();
  }
];

/**
 * Middleware para validar datos de login
 */
export const validateLogin = [
  body('correo')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un correo electrónico válido'),
  
  body('contrasena')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de login inválidos',
          details: errors.array()
        }
      });
    }
    next();
  }
];

/**
 * Middleware para validar datos de cabina
 */
export const validateCabina = [
  body('cabina_id')
    .isInt({ min: 1 })
    .withMessage('El ID de cabina debe ser un número entero positivo'),
  
  body('codigo_interno')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('El código interno debe tener entre 1 y 20 caracteres')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('El código interno solo puede contener letras mayúsculas, números, guiones y guiones bajos'),
  
  body('fecha_fabricacion')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fabricación debe ser una fecha válida'),
  
  body('estado_actual')
    .isIn(['operativo', 'inusual', 'alerta', 'fuera de servicio'])
    .withMessage('El estado debe ser: operativo, inusual, alerta o fuera de servicio'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de cabina inválidos',
          details: errors.array()
        }
      });
    }
    next();
  }
];

/**
 * Middleware para validar parámetros de ID
 */
export const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ID inválido',
          details: errors.array()
        }
      });
    }
    next();
  }
];

/**
 * Middleware para validar datos de medición de sensores
 */
export const validateMedicion = [
  body('sensor_id')
    .isInt({ min: 1 })
    .withMessage('El ID del sensor debe ser un número entero positivo'),
  
  body('latitud')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('La latitud debe estar entre -90 y 90'),
  
  body('longitud')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('La longitud debe estar entre -180 y 180'),
  
  body('altitud')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La altitud debe ser un número positivo'),
  
  body('velocidad')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La velocidad debe ser un número positivo'),
  
  body('rms')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El RMS debe ser un número positivo'),
  
  body('estado_procesado')
    .optional()
    .isIn(['operativo', 'inusual', 'alerta'])
    .withMessage('El estado procesado debe ser: operativo, inusual o alerta'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de medición inválidos',
          details: errors.array()
        }
      });
    }
    next();
  }
];
