import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import { comparePassword } from '../utils/password.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/jwtHelper.js';
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
  // Firmar token con las claves esperadas por los middlewares: { id, email, role }
  const token = signToken({ id: u.usuario_id, email: u.correo, role: u.rol });
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