import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import { comparePassword, hashPassword, validatePasswordStrength } from '../utils/password.js';
import { signToken, signRefreshToken, verifyRefreshToken, setAuthCookie, clearAuthCookie, signPasswordResetToken, verifyToken } from '../utils/jwtHelper.js';
import * as Users from '../models/userModel.js';
import * as Audit from '../models/auditoriaModel.js';
import * as UserRoles from '../models/userRolModel.js';
import crypto from 'crypto';

export const login = asyncHandler(async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) throw new AppError('Datos inválidos', { status: 400, code: 'VALIDATION_ERROR' });

  const u = await Users.findByEmail(correo);
  if (!u) {
    return res.status(401).json({ ok: false, error: { code: 'BAD_CREDENTIALS', message: 'Credenciales inválidas' } });
  }
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    throw new AppError('Cuenta bloqueada temporalmente. Intenta más tarde.', { status: 423, code: 'ACCOUNT_LOCKED' });
  }

  const ok = await comparePassword(password, u.password_hash);
  if (!ok) {
    await Users.recordFailedLogin(u.usuario_id);
    await Audit.log({ usuario_id: u.usuario_id, accion: 'LOGIN_FAIL', detalles: { correo } });
    throw new AppError('Credenciales inválidas', { status: 401, code: 'BAD_CREDENTIALS' });
  }

  // Obtener roles del usuario para verificar si es admin
  const userRoles = await UserRoles.getUserRoles(u.usuario_id);
  const userRoleNames = userRoles.map(r => r.nombre_rol.toLowerCase());
  const isAdmin = userRoleNames.includes('admin');
  
  // Determinar si debe cambiar contraseña
  // - juan.perez@example.com NUNCA es forzado
  // - No-admin con last_login_at NULL DEBE cambiar
  // - Admin (excepto juan.perez) con last_login_at NULL puede cambiar pero no es obligatorio
  const isMainAdmin = correo.toLowerCase() === 'juan.perez@example.com';
  const isFirstLogin = !u.last_login_at;
  const mustChangePassword = !isMainAdmin && !isAdmin && isFirstLogin;

  await Users.recordSuccessfulLogin(u.usuario_id);

  // Firmar token con las claves esperadas por los middlewares: { id, email, rol, must_change_password }
  const tokenPayload = { 
    id: u.usuario_id, 
    email: u.correo, 
    rol: u.rol,
    must_change_password: mustChangePassword
  };
  const token = signToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  setAuthCookie(res, token, refreshToken);
  await Audit.log({ usuario_id: u.usuario_id, accion: 'LOGIN', detalles: { correo } });

  res.json({ 
    ok: true, 
    data: { 
      id: u.usuario_id, 
      nombre: u.nombre, 
      correo: u.correo, 
      rol: u.rol,
      must_change_password: mustChangePassword
    } 
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: { user: req.user } });
});

export const logout = asyncHandler(async (req, res) => {
  await Audit.log({ usuario_id: req.user.id, accion: 'LOGOUT' });
  clearAuthCookie(res);
  res.json({ ok: true, data: { message: 'Sesión cerrada' } });
});

// Helper para remover metacampos JWT antes de re-firmar
function stripIatExp(obj) {
  if (!obj) return {};
  // Remover solo metadatos JWT (iat, exp, nbf), preservar todos los demás campos
  const { iat, exp, nbf, ...rest } = obj;
  // Si hay 'sub' pero no 'id', usar 'sub' como 'id'
  if (rest.sub && !rest.id) {
    rest.id = rest.sub;
  }
  return rest;
}

export const refresh = asyncHandler(async (req, res) => {
  const refreshCookieName = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
  const refreshToken = req.cookies?.[refreshCookieName];

  if (!refreshToken) {
    throw new AppError('No hay refresh token', { status: 401, code: 'NO_REFRESH_TOKEN' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    // Preservar todos los campos excepto metadatos JWT (iat, exp, nbf)
    // Esto mantiene: id, email, rol, must_change_password, etc.
    const base = stripIatExp(payload);

    const newAccess = signToken(base);
    const newRefresh = signRefreshToken(base);

    setAuthCookie(res, newAccess, newRefresh);
    res.json({ ok: true, data: { message: 'Token renovado' } });
  } catch (_err) {
    clearAuthCookie(res);
    throw new AppError('Refresh token inválido', { status: 401, code: 'INVALID_REFRESH' });
  }
});

export const changePassword = asyncHandler(async (req, res) => {
  const { old_password, new_password, confirm_password } = req.body;
  const userId = req.user.id;

  if (!old_password || !new_password || !confirm_password) {
    throw new AppError('Todos los campos son requeridos', { status: 400, code: 'VALIDATION_ERROR' });
  }

  if (new_password !== confirm_password) {
    throw new AppError('Las contraseñas no coinciden', { status: 400, code: 'VALIDATION_ERROR' });
  }

  if (old_password === new_password) {
    throw new AppError('La nueva contraseña debe ser diferente a la actual', { status: 400, code: 'VALIDATION_ERROR' });
  }

  // Validar fortaleza
  const validation = validatePasswordStrength(new_password);
  if (!validation.isValid) {
    throw new AppError('Contraseña no cumple con los requisitos', { 
      status: 400, 
      code: 'VALIDATION_ERROR',
      details: validation.errors 
    });
  }

  // Verificar contraseña actual
  const user = await Users.findById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', { status: 404, code: 'NOT_FOUND' });
  }

  const u = await Users.findByEmail(user.correo); // Necesitamos password_hash
  const isOldPasswordValid = await comparePassword(old_password, u.password_hash);
  if (!isOldPasswordValid) {
    throw new AppError('Contraseña actual incorrecta', { status: 401, code: 'BAD_CREDENTIALS' });
  }

  // Actualizar contraseña y establecer must_change_password = false
  const newPasswordHash = await hashPassword(new_password, 12);
  const updated = await Users.updateUser(userId, { 
    passwordHash: newPasswordHash,
    must_change_password: false // Ya cambió la contraseña, no debe forzarse más
  });
  
  // Si era primer login, actualizar last_login_at
  if (!user.last_login_at) {
    await Users.recordSuccessfulLogin(userId);
  }

  // Obtener datos actualizados del usuario después de cambiar contraseña
  const updatedUser = await Users.findById(userId);
  if (!updatedUser) {
    throw new AppError('Error al obtener usuario actualizado', { status: 500, code: 'INTERNAL_ERROR' });
  }

  // Obtener roles actualizados
  const userRoles = await UserRoles.getUserRoles(userId);
  const userRoleNames = userRoles.map(r => r.nombre_rol.toLowerCase());
  const isAdmin = userRoleNames.includes('admin');
  const isMainAdmin = updatedUser.correo.toLowerCase() === 'juan.perez@example.com';
  
  // Verificar must_change_password desde la BD (debe ser false ahora)
  const mustChangePasswordFromDB = updatedUser.must_change_password === true;
  const mustChangePassword = false; // Ya cambió la contraseña, siempre false

  // Generar nuevo token con must_change_password = false
  const tokenPayload = {
    id: updatedUser.usuario_id,
    email: updatedUser.correo,
    rol: updatedUser.rol,
    must_change_password: mustChangePassword
  };
  const newToken = signToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);
  
  // Establecer ambas cookies (access y refresh) para asegurar que se use el nuevo token
  setAuthCookie(res, newToken, newRefreshToken);

  await Audit.log({ 
    usuario_id: userId, 
    accion: 'PASSWORD_CHANGED', 
    detalles: { self_change: true } 
  });

  res.json({ 
    ok: true, 
    data: { 
      message: 'Contraseña actualizada exitosamente',
      must_change_password: false,
      token_refreshed: true
    } 
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email, correo } = req.body;
  const emailToUse = email || correo; // Aceptar ambos campos
  if (!emailToUse) {
    // Respuesta genérica para no filtrar existencia de cuenta
    return res.status(200).json({ 
      ok: true, 
      data: { message: 'Si el correo existe, se enviará un enlace de recuperación' } 
    });
  }

  const u = await Users.findByEmail(emailToUse);
  if (!u) {
    // Respuesta genérica para no filtrar existencia
    return res.status(200).json({ 
      ok: true, 
      data: { message: 'Si el correo existe, se enviará un enlace de recuperación' } 
    });
  }

  // Generar hash del password_hash actual para invalidar tokens antiguos
  const pwdHash = crypto.createHash('sha256').update(u.password_hash).digest('hex');

  // Generar token de reset
  const resetToken = signPasswordResetToken({
    sub: u.usuario_id,
    pr: 'pwd_reset',
    pwd: pwdHash
  });

  // En entorno DEV, devolver el token en la respuesta (no en producción)
  if (process.env.NODE_ENV !== 'production') {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await Audit.log({ 
      usuario_id: u.usuario_id, 
      accion: 'PASSWORD_RESET_REQUESTED', 
      detalles: { correo: emailToUse } 
    });
    
    return res.status(200).json({ 
      ok: true, 
      data: { 
        message: 'Si el correo existe, se enviará un enlace de recuperación',
        // Solo en DEV:
        resetUrl,
        token: resetToken
      } 
    });
  }

  // En producción, aquí deberías enviar el email con el enlace
  // Ejemplo: await sendEmail(email, resetToken);
  
  await Audit.log({ 
    usuario_id: u.usuario_id, 
    accion: 'PASSWORD_RESET_REQUESTED', 
    detalles: { correo: emailToUse } 
  });

  res.status(200).json({ 
    ok: true, 
    data: { message: 'Si el correo existe, se enviará un enlace de recuperación' } 
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password, confirm_password } = req.body;

  if (!token || !new_password || !confirm_password) {
    throw new AppError('Token, nueva contraseña y confirmación son requeridos', { status: 400, code: 'VALIDATION_ERROR' });
  }

  if (new_password !== confirm_password) {
    throw new AppError('Las contraseñas no coinciden', { status: 400, code: 'VALIDATION_ERROR' });
  }

  // Validar fortaleza
  const validation = validatePasswordStrength(new_password);
  if (!validation.isValid) {
    throw new AppError('Contraseña no cumple con los requisitos', { 
      status: 400, 
      code: 'VALIDATION_ERROR',
      details: validation.errors 
    });
  }

  // Verificar token
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new AppError('Token inválido o expirado', { status: 401, code: 'INVALID_TOKEN' });
  }

  if (payload.pr !== 'pwd_reset') {
    throw new AppError('Token inválido', { status: 401, code: 'INVALID_TOKEN' });
  }

  // Obtener usuario
  const u = await Users.findById(payload.sub);
  if (!u) {
    throw new AppError('Usuario no encontrado', { status: 404, code: 'NOT_FOUND' });
  }

  const fullUser = await Users.findByEmail(u.correo); // Necesitamos password_hash
  if (!fullUser) {
    throw new AppError('Usuario no encontrado', { status: 404, code: 'NOT_FOUND' });
  }

  // Verificar que el hash del password_hash actual coincida con el del token
  const currentPwdHash = crypto.createHash('sha256').update(fullUser.password_hash).digest('hex');
  if (payload.pwd !== currentPwdHash) {
    throw new AppError('Token inválido o ya fue utilizado', { status: 401, code: 'INVALID_TOKEN' });
  }

  // Actualizar contraseña
  const newPasswordHash = await hashPassword(new_password, 12);
  await Users.updateUser(u.usuario_id, { passwordHash: newPasswordHash });

  // Si era primer login, actualizar last_login_at
  if (!u.last_login_at) {
    await Users.recordSuccessfulLogin(u.usuario_id);
  }

  // Generar nuevo JWT de sesión (login directo)
  const userRoles = await UserRoles.getUserRoles(u.usuario_id);
  const tokenPayload = {
    id: u.usuario_id,
    email: u.correo,
    rol: u.rol,
    must_change_password: false
  };
  const newToken = signToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);
  setAuthCookie(res, newToken, newRefreshToken);

  await Audit.log({ 
    usuario_id: u.usuario_id, 
    accion: 'PASSWORD_RESET_COMPLETED', 
    detalles: { via_token: true } 
  });

  res.json({ ok: true, data: { message: 'Contraseña restablecida exitosamente' } });
});

/**
 * authController.js
 * 
 * @description Controlador de autenticación para UrbanFlow con seguridad empresarial
 * @version 1.0
 * 
 * @requires ../middlewares/asyncHandler.js
 * @requires ../errors/AppError.js
 * @requires ../utils/password.js
 * @requires ../utils/jwtHelper.js
 * @requires ../models/userModel.js
 * @requires ../models/auditoriaModel.js
 * 
 * @overview Sistema completo de autenticación con JWT, cookies seguras, auditoría
 *           y protección contra fuerza bruta. Cumple con RF5 y RF6 del documento.
 * 
 * @method login
 * @description Autentica un usuario y genera token JWT con cookie segura
 * @param {Object} req - Request con { correo, password }
 * @param {Object} res - Response
 * @returns {Object} { ok: true, data: { id, nombre, correo, rol } }
 * @throws {AppError} 400 - Datos inválidos, 401 - Credenciales incorrectas, 423 - Cuenta bloqueada
 * @security Registra intentos fallidos y bloquea cuentas temporalmente
 * 
 * @method me
 * @description Obtiene información del usuario actualmente autenticado
 * @param {Object} req - Request (debe tener user del middleware de auth)
 * @param {Object} res - Response
 * @returns {Object} { ok: true, data: { user } }
 * 
 * @method logout
 * @description Cierra la sesión del usuario limpiando la cookie de autenticación
 * @param {Object} req - Request con usuario autenticado
 * @param {Object} res - Response
 * @returns {Object} { ok: true, data: { message: 'Sesión cerrada' } }
 * @security Registra el logout en auditoría
 * 
 * @example
 * // Login exitoso:
 * POST /api/auth/login
 * Body: { "correo": "operador@urbanflow.com", "password": "miPassword123" }
 * Response: { 
 *   "ok": true, 
 *   "data": { 
 *     "id": "507f1f77bcf86cd799439011", 
 *     "nombre": "Carlos Operador", 
 *     "correo": "operador@urbanflow.com", 
 *     "rol": "operador" 
 *   }
 * }
 * 
 * // Login fallido:
 * Response: { 
 *   "ok": false, 
 *   "error": { 
 *     "code": "BAD_CREDENTIALS", 
 *     "message": "Credenciales inválidas" 
 *   }
 * }
 * 
 * @audit Se registran todos los intentos de login (exitosos y fallidos)
 * @security Implementa bloqueo temporal tras múltiples intentos fallidos
 */