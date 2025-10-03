import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import * as Users from '../models/userModel.js';
import * as UserRoles from '../models/userRolModel.js';
import * as Roles from '../models/rolModel.js';
import * as Audit from '../models/auditoriaModel.js';
import { hashPassword } from '../utils/password.js';

// Listado de usuarios (usado por routes/userRoutes.js -> GET /api/users)
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
    sortDir: sortDir || 'desc',
  });
  res.json({ ok: true, data: data.items, meta: { total: data.total, limit: Number(limit) || 20, offset: Number(offset) || 0 } });
});

export const getUser = asyncHandler(async (req, res) => {
  const u = await Users.findById(req.params.id);
  if (!u) throw new AppError('No encontrado', { status: 404, code: 'NOT_FOUND' });
  const rolesAssigned = await UserRoles.getUserRoles(u.usuario_id);
  res.json({ ok: true, data: { ...u, roles: rolesAssigned.map(r => r.nombre_rol) } });
});
export const createUser = asyncHandler(async (req, res) => {
  const { nombre, correo, password, passwordHash, mustChangePassword = false } = req.body || {};
  let { rol, roles } = req.body || {};
  if (!nombre || !correo || (!password && !passwordHash)) {
    throw new AppError('Datos inválidos: se requiere password o passwordHash', { status: 400, code: 'VALIDATION_ERROR' });
  }

  // Normalizar roles a arreglo
  let desiredRoles = [];
  if (Array.isArray(roles)) desiredRoles = roles;
  else if (Array.isArray(rol)) desiredRoles = rol;
  else if (typeof rol === 'string' && rol.trim()) desiredRoles = [rol];
  else desiredRoles = ['usuario'];

  // Validar roles existentes y activos
  for (const rname of desiredRoles) {
    const r = await Roles.findByName(rname);
    if (!r || r.deleted_at || r.is_active === false) {
      throw new AppError(`Rol inválido: "${rname}". Usa un rol existente y activo.`, { status: 400, code: 'INVALID_ROLE' });
    }
  }

  // Rol primario = Primero del arreglo
  const primaryRole = desiredRoles[0];
  const finalHash = password ? await hashPassword(password, 12) : passwordHash;
  const user = await Users.createUser({ nombre, correo, passwordHash: finalHash, rol: primaryRole, mustChangePassword });

  // Sincronizar roles en rol_usuario
  for (const rname of desiredRoles) {
    await UserRoles.assignRoleSafe({ targetUserId: user.usuario_id, roleIdOrName: rname, actorUserId: req.user.id });
  }

  const rolesAssigned = await UserRoles.getUserRoles(user.usuario_id);
  await Audit.log({ usuario_id: req.user.id, accion: 'CREATE_USER', detalles: { usuario_id: user.usuario_id, roles: desiredRoles } });
  res.status(201).json({ ok: true, data: { ...user, roles: rolesAssigned.map(r => r.nombre_rol) } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, passwordHash } = req.body || {};
  const body = { ...req.body };
  if (password) {
    body.passwordHash = await hashPassword(password, 12);
    delete body.password;
  } else if (passwordHash) {
    body.passwordHash = passwordHash;
  }

  // Normalizar roles a arreglo si llegan
  let desiredRoles = null; // null = no cambiar roles
  if (Array.isArray(body.roles)) desiredRoles = body.roles;
  else if (Array.isArray(body.rol)) desiredRoles = body.rol;
  else if (typeof body.rol === 'string' && body.rol.trim()) desiredRoles = [body.rol];

  if (desiredRoles) {
    for (const rname of desiredRoles) {
      const r = await Roles.findByName(rname);
      if (!r || r.deleted_at || r.is_active === false) {
        throw new AppError(`Rol inválido: "${rname}". Usa un rol existente y activo.`, { status: 400, code: 'INVALID_ROLE' });
      }
    }
    body.rol = desiredRoles[0];
  }

  const userId = Number(req.params.id);
  const updated = await Users.updateUser(userId, body);
  if (!updated) throw new AppError('No encontrado', { status: 404, code: 'NOT_FOUND' });

  if (desiredRoles) {
    const current = await UserRoles.getUserRoles(userId);
    const currentNames = current.map(r => r.nombre_rol);
    const want = Array.from(new Set(desiredRoles));
    const toAdd = want.filter(r => !currentNames.includes(r));
    const toRemove = currentNames.filter(r => !want.includes(r));

    for (const rname of toAdd) {
      await UserRoles.assignRoleSafe({ targetUserId: userId, roleIdOrName: rname, actorUserId: req.user.id });
    }
    for (const rname of toRemove) {
      await UserRoles.removeRoleSafe({ targetUserId: userId, roleIdOrName: rname, actorUserId: req.user.id });
    }
  }

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
