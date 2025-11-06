// validators/authValidator.js (ESM)
import { body, validationResult } from 'express-validator';

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: errors.array().map(e => ({ field: e.path, message: e.msg, value: e.value }))
      }
    });
  }
  next();
}

export const validateLogin = [
  body('correo').isEmail().normalizeEmail().withMessage('correo inválido'),
  body('password').isString().isLength({ min: 8, max: 128 }).withMessage('password inválido'),
  handleValidation,
];

export const validateChangePassword = [
  body('old_password').isString().notEmpty().withMessage('Contraseña actual es requerida'),
  body('new_password').isString().isLength({ min: 8, max: 128 }).withMessage('Nueva contraseña debe tener al menos 8 caracteres'),
  body('confirm_password').isString().notEmpty().withMessage('Confirmación de contraseña es requerida'),
  handleValidation,
];

export const validateForgotPassword = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Email inválido'),
  body('correo').optional().isEmail().normalizeEmail().withMessage('Correo inválido'),
  (req, res, next) => {
    const { email, correo } = req.body;
    if (!email && !correo) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Se requiere email o correo'
        }
      });
    }
    next();
  },
  handleValidation,
];

export const validateResetPassword = [
  body('token').isString().notEmpty().withMessage('Token es requerido'),
  body('new_password').isString().isLength({ min: 8, max: 128 }).withMessage('Nueva contraseña debe tener al menos 8 caracteres'),
  body('confirm_password').isString().notEmpty().withMessage('Confirmación de contraseña es requerida'),
  handleValidation,
];

export default { validateLogin, validateChangePassword, validateForgotPassword, validateResetPassword };
