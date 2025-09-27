import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import * as Users from '../models/userModel.js';
import * as UserRoles from '../models/userRolModel.js';
import * as Roles from '../models/rolModel.js';
import * as Audit from '../models/auditoriaModel.js';
import { hashPassword } from '../utils/password.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { search, rol, isActive, includeDeleted, limit, offset, sortBy, sortDir } = req.query;
  const data = await Users.list({
    search: search || '',
    rol: rol || null,
    isActive: isActive === undefined ? null : isActive === 'true',
    includeDeleted: includeDeleted === 'true',
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
    sortBy: sortBy || 'usuario_id',
    sortDir: sortDir || 'desc'
  });
  res.json({ ok: true, data: data.items, meta: { total: data.total, limit: Number(limit) || 20, offset: Number(offset) || 0 } });
});

export const getUser = asyncHandler(async (req, res) => {
  const u = await Users.findById(req.params.id);
  if (!u) throw new AppError('No encontrado', { status: 404, code: 'NOT_FOUND' });
  res.json({ ok: true, data: u });
});

export const createUser = asyncHandler(async (req, res) => {
  const { nombre, correo, password, passwordHash, rol = 'usuario', mustChangePassword = false } = req.body;
  if (!nombre || !correo || (!password && !passwordHash)) {
    throw new AppError('Datos inválidos: se requiere password o passwordHash', { status: 400, code: 'VALIDATION_ERROR' });
  }
  // Validar que el rol exista y esté activo en la tabla roles (admin, operador, analista, cliente, ...)
  if (rol) {
    const role = await Roles.findByName(rol);
    if (!role || role.deleted_at || role.is_active === false) {
      throw new AppError(`Rol inválido: "${rol}". Usa un rol existente y activo.`, { status: 400, code: 'INVALID_ROLE' });
    }
  }
  // Si viene password en texto plano, lo hasheamos server-side
  const finalHash = password ? await hashPassword(password, 12) : passwordHash;
  const user = await Users.createUser({ nombre, correo, passwordHash: finalHash, rol, mustChangePassword });
  await Audit.log({ usuario_id: req.user.id, accion: 'CREATE_USER', detalles: { usuario_id: user.usuario_id } });
  res.status(201).json({ ok: true, data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  // Permitir actualizar con password en texto plano o con passwordHash directamente
  const { password, passwordHash } = req.body || {};
  const body = { ...req.body };
  if (password) {
    body.passwordHash = await hashPassword(password, 12);
    delete body.password; // no almacenar el texto plano
  } else if (passwordHash) {
    body.passwordHash = passwordHash;
  }

  // Validar rol si viene en la actualización
  if (body.rol !== undefined) {
    const role = await Roles.findByName(body.rol);
    if (!role || role.deleted_at || role.is_active === false) {
      throw new AppError(`Rol inválido: "${body.rol}". Usa un rol existente y activo.`, { status: 400, code: 'INVALID_ROLE' });
    }
  }

  const updated = await Users.updateUser(req.params.id, body);
  if (!updated) throw new AppError('No encontrado', { status: 404, code: 'NOT_FOUND' });

  await Audit.log({ usuario_id: req.user.id, accion: 'UPDATE_USER', detalles: { usuario_id: req.params.id, cambios: req.body } });
  res.json({ ok: true, data: updated });
});

export const removeUser = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.id === targetId)
    throw new AppError('No puedes eliminar tu propio usuario', { status: 403, code: 'FORBIDDEN' });

  const adminRole = await Roles.findByName('admin');
  if (adminRole) {
    const isTargetAdmin = await UserRoles.hasRole(targetId, adminRole.rol_id);
    if (isTargetAdmin) {
      const { total } = await UserRoles.getUsersByRole(adminRole.rol_id, { limit: 1, offset: 0 });
      if (total <= 1) throw new AppError('No puedes eliminar al último admin del sistema', { status: 403, code: 'LAST_ADMIN' });
    }
  }

  const removed = await Users.softDeleteUser(targetId);
  if (!removed) throw new AppError('No encontrado', { status: 404, code: 'NOT_FOUND' });

  await Audit.log({ usuario_id: req.user.id, accion: 'DELETE_USER', detalles: { usuario_id: targetId } });
  res.json({ ok: true, data: removed });
});
