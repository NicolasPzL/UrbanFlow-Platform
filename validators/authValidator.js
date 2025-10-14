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

export default { validateLogin };
