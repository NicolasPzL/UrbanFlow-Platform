import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import { comparePassword } from '../utils/password.js';
import { signToken, signRefreshToken, verifyRefreshToken, setAuthCookie, clearAuthCookie } from '../utils/jwtHelper.js';
import * as Users from '../models/userModel.js';
import * as Audit from '../models/auditoriaModel.js';

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

  await Users.recordSuccessfulLogin(u.usuario_id);

  // Firmar token con las claves esperadas por los middlewares: { id, email, rol }
  const token = signToken({ id: u.usuario_id, email: u.correo, rol: u.rol });
  setAuthCookie(res, token);
  await Audit.log({ usuario_id: u.usuario_id, accion: 'LOGIN', detalles: { correo } });

  res.json({ ok: true, data: { id: u.usuario_id, nombre: u.nombre, correo: u.correo, rol: u.rol } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: { user: req.user } });
});

export const logout = asyncHandler(async (req, res) => {
  await Audit.log({ usuario_id: req.user.id, accion: 'LOGOUT' });
  clearAuthCookie(res);
  res.json({ ok: true, data: { message: 'Sesión cerrada' } });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshCookieName = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
  const refreshToken = req.cookies?.[refreshCookieName];

  if (!refreshToken) {
    throw new AppError('No hay refresh token', { status: 401, code: 'NO_REFRESH_TOKEN' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const base = { sub: payload.sub, rol: payload.rol };

    const newAccess = signToken(base);
    const newRefresh = signRefreshToken(base);

    setAuthCookie(res, newAccess, newRefresh);
    res.json({ ok: true, data: { message: 'Token renovado' } });
  } catch (_err) {
    clearAuthCookie(res);
    throw new AppError('Refresh token inválido', { status: 401, code: 'INVALID_REFRESH' });
  }
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