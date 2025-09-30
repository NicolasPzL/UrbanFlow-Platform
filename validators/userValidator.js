// validators/userValidator.js (ESM)
// Validaciones ligeras sin dependencias externas.
// Si deseas Joi/Zod más adelante, podemos reemplazar estas funciones.

function isEmail(value) {
  return typeof value === 'string' && /.+@.+\..+/.test(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function booleanOrUndefined(v) {
  return v === undefined || typeof v === 'boolean';
}

export function validateCreateUser(req, res, next) {
  const { nombre, correo, password, passwordHash, rol, mustChangePassword } = req.body || {};

  const errors = [];
  if (!nonEmptyString(nombre)) errors.push('nombre es requerido');
  if (!isEmail(correo)) errors.push('correo debe ser un email válido');

  // Se requiere password en texto plano o passwordHash
  if (!nonEmptyString(password) && !nonEmptyString(passwordHash)) {
    errors.push('Se requiere password o passwordHash');
  }

  if (mustChangePassword !== undefined && typeof mustChangePassword !== 'boolean') {
    errors.push('mustChangePassword debe ser boolean');
  }

  if (rol !== undefined && typeof rol !== 'string') {
    errors.push('rol debe ser string');
  }

  if (errors.length) {
    return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: errors } });
  }

  return next();
}

export function validateUpdateUser(req, res, next) {
  const { nombre, correo, rol, is_active, must_change_password, password, passwordHash } = req.body || {};

  const errors = [];
  if (nombre !== undefined && !nonEmptyString(nombre)) errors.push('nombre no puede ser vacío');
  if (correo !== undefined && !isEmail(correo)) errors.push('correo debe ser un email válido');
  if (rol !== undefined && typeof rol !== 'string') errors.push('rol debe ser string');
  if (!booleanOrUndefined(is_active)) errors.push('is_active debe ser boolean');
  if (!booleanOrUndefined(must_change_password)) errors.push('must_change_password debe ser boolean');

  // Si envía password o passwordHash, validar que sean strings no vacíos
  if (password !== undefined && !nonEmptyString(password)) errors.push('password no puede ser vacío');
  if (passwordHash !== undefined && !nonEmptyString(passwordHash)) errors.push('passwordHash no puede ser vacío');

  if (errors.length) {
    return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: errors } });
  }

  return next();
}
