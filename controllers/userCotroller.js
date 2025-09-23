import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import * as Users from '../models/userModel.js';
import * as UserRoles from '../models/userRolModel.js';
import * as Roles from '../models/rolModel.js';
import * as Audit from '../models/auditoriaModel.js';

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
  const { nombre, correo, passwordHash, rol = 'usuario', mustChangePassword = false } = req.body;
  if (!nombre || !correo || !passwordHash) {
    throw new AppError('Datos inválidos', { status: 400, code: 'VALIDATION_ERROR' });
  }
  const user = await Users.createUser({ nombre, correo, passwordHash, rol, mustChangePassword });
  await Audit.log({ usuario_id: req.user.id, accion: 'CREATE_USER', detalles: { usuario_id: user.usuario_id } });
  res.status(201).json({ ok: true, data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const updated = await Users.updateUser(req.params.id, req.body);
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