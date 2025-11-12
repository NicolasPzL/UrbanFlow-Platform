// validators/userValidator.js (ESM)
// Validaciones ligeras sin dependencias externas.
// Si deseas Joi/Zod más adelante, podemos reemplazar estas funciones.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim());
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function booleanOrUndefined(v) {
  return v === undefined || typeof v === 'boolean';
}

export function validateCreateUser(req, res, next) {
  const { nombre, correo, rol, roles } = req.body || {};

  const errors = [];
  if (!nonEmptyString(nombre)) errors.push('nombre es requerido');
  if (!isEmail(correo)) errors.push('correo debe ser un email válido');

  // Ya NO se requiere password - se genera automáticamente

  // roles puede venir como array, y rol puede venir como string o array
  const isStringArray = (arr) => Array.isArray(arr) && arr.every((v) => typeof v === 'string' && v.trim().length > 0);

  if (rol !== undefined && !(typeof rol === 'string' || isStringArray(rol))) {
    errors.push('rol debe ser string o array de strings');
  }
  if (roles !== undefined && !isStringArray(roles)) {
    errors.push('roles debe ser un array de strings no vacíos');
  }

  if (errors.length) {
    return res.status(422).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: errors } });
  }

  return next();
}

export function validateUpdateUser(req, res, next) {
  const { nombre, correo, rol, roles, is_active, must_change_password, password, passwordHash } = req.body || {};

  const errors = [];
  if (nombre !== undefined && !nonEmptyString(nombre)) errors.push('nombre no puede ser vacío');
  if (correo !== undefined && !isEmail(correo)) errors.push('correo debe ser un email válido');
  const isStringArray = (arr) => Array.isArray(arr) && arr.every((v) => typeof v === 'string' && v.trim().length > 0);
  if (rol !== undefined && !(typeof rol === 'string' || isStringArray(rol))) errors.push('rol debe ser string o array de strings');
  if (roles !== undefined && !isStringArray(roles)) errors.push('roles debe ser un array de strings no vacíos');
  if (!booleanOrUndefined(is_active)) errors.push('is_active debe ser boolean');
  if (!booleanOrUndefined(must_change_password)) errors.push('must_change_password debe ser boolean');

  // Si envía password o passwordHash, validar que sean strings no vacíos
  if (password !== undefined && !nonEmptyString(password)) errors.push('password no puede ser vacío');
  if (passwordHash !== undefined && !nonEmptyString(passwordHash)) errors.push('passwordHash no puede ser vacío');

  if (errors.length) {
    return res.status(422).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: errors } });
  }

  return next();
}
