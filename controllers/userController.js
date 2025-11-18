import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import * as Users from '../models/userModel.js';
import * as UserRoles from '../models/userRolModel.js';
import * as Roles from '../models/rolModel.js';
import { hashPassword, generateTemporaryPassword } from '../utils/password.js';
import { auditEvent } from '../middlewares/audit.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const CLIENT_ROLE = 'cliente';
const STAFF_ROLES = new Set(['admin', 'operador', 'analista']);

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
  const actorId = req.user?.id ?? null;
  const actorEmail = req.user?.email ?? null;
  const nombreRaw = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const correoRaw = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
  let { rol, roles } = req.body || {};

  const auditFailure = async (reason, extra = {}) => {
    await auditEvent({
      event: 'user.create.fail',
      actorId,
      actorEmail,
      ip: req.ip ?? null,
      metadata: { actor: actorId, email: correoRaw, reason, ...extra },
    });
  };

  if (!nombreRaw) {
    await auditFailure('INVALID_NAME');
    throw new AppError('El nombre es requerido', {
      status: 422,
      code: 'VALIDATION_ERROR',
      details: { field: 'nombre' },
    });
  }

  if (!correoRaw || !correoRaw.includes('@') || !EMAIL_REGEX.test(correoRaw)) {
    await auditFailure('INVALID_EMAIL');
    throw new AppError('El correo es inválido', {
      status: 422,
      code: 'VALIDATION_ERROR',
      details: { field: 'correo' },
    });
  }

  // Normalizar roles a arreglo
  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) return [value];
    return [];
  };
  let desiredRoles = [
    ...new Set(
      [...toArray(rol), ...toArray(roles)].map((r) => r.toString().trim().toLowerCase())
    ),
  ];
  if (!desiredRoles.length) {
    desiredRoles = ['operador'];
  }

  const hasClient = desiredRoles.includes(CLIENT_ROLE);
  const hasStaff = desiredRoles.some((r) => STAFF_ROLES.has(r));

  if (hasClient && hasStaff) {
    await auditFailure('INVALID_ROLES_COMBO', { roles: desiredRoles });
    throw new AppError('El rol "cliente" no puede combinarse con admin, analista u operador', {
      status: 422,
      code: 'INVALID_ROLES',
      details: { roles: desiredRoles },
    });
  }

  const existing = await Users.findByEmail(correoRaw, { includeDeleted: true });
  if (existing) {
    await auditFailure('EMAIL_EXISTS', { userId: existing.usuario_id });
    throw new AppError('Ya existe un usuario con ese correo', {
      status: 409,
      code: 'EMAIL_EXISTS',
      details: { field: 'correo' },
    });
  }

  // Validar roles existentes y activos
  for (const rname of desiredRoles) {
    const roleRecord = await Roles.findByName(rname);
    if (!roleRecord || roleRecord.deleted_at || roleRecord.is_active === false) {
      await auditFailure('INVALID_ROLE', { role: rname });
      throw new AppError(`Rol inválido: "${rname}". Usa un rol existente y activo.`, {
        status: 422,
        code: 'INVALID_ROLE',
        details: { role: rname },
      });
    }
  }

  // Generar contraseña temporal segura (12-16 caracteres)
  const tempPassword = generateTemporaryPassword(14);
  const passwordHash = await hashPassword(tempPassword, 12);

  // Rol primario = Primero del arreglo
  const primaryRole = desiredRoles[0];
  // Usuarios no-admin deben cambiar contraseña en primer login
  const mustChangePassword = !desiredRoles.includes('admin');

  try {
    const user = await Users.createUser({
      nombre: nombreRaw,
      correo: correoRaw,
      passwordHash,
      rol: primaryRole,
      mustChangePassword,
    });

    // Sincronizar roles en rol_usuario
    for (const rname of desiredRoles) {
      await UserRoles.assignRoleSafe({
        targetUserId: user.usuario_id,
        roleIdOrName: rname,
        actorUserId: req.user.id,
      });
    }

    const rolesAssigned = await UserRoles.getUserRoles(user.usuario_id);
    await auditEvent({
      event: 'user.create.ok',
      actorId,
      actorEmail,
      ip: req.ip ?? null,
      metadata: {
        actor: actorId,
        userId: user.usuario_id,
        roles: desiredRoles,
        email: correoRaw,
      },
    });

    res.status(201).json({
      ok: true,
      data: {
        ...user,
        correo: correoRaw,
        roles: rolesAssigned.map((r) => r.nombre_rol),
        temporaryPassword: tempPassword,
      },
    });
  } catch (err) {
    await auditFailure('PERSISTENCE_ERROR', { error: err.message });
    throw err;
  }
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

  await auditEvent({
    event: 'USER_UPDATE',
    actorId: req.user.id ?? null,
    actorEmail: req.user.email ?? null,
    ip: req.ip ?? null,
    metadata: { usuario_id: req.params.id, cambios: req.body },
  });
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

  await auditEvent({
    event: 'USER_DELETE',
    actorId: req.user.id ?? null,
    actorEmail: req.user.email ?? null,
    ip: req.ip ?? null,
    metadata: { usuario_id: targetId },
  });
  res.json({ ok: true, data: removed });
});

export const restoreUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const actorId = req.user?.id ?? null;
  const actorEmail = req.user?.email ?? null;

  const existing = await Users.findById(userId, { includeDeleted: true });
  if (!existing) {
    throw new AppError('Usuario no encontrado', { status: 404, code: 'NOT_FOUND' });
  }
  if (!existing.deleted_at) {
    throw new AppError('El usuario ya está activo', { status: 409, code: 'ALREADY_ACTIVE' });
  }

  const restored = await Users.restoreUser(userId);
  if (!restored) {
    throw new AppError('Usuario no encontrado', { status: 404, code: 'NOT_FOUND' });
  }

  await auditEvent({
    event: 'user.restore',
    actorId,
    actorEmail,
    ip: req.ip ?? null,
    metadata: { actor: actorId, userId, email: restored.correo },
  });

  res.json({ ok: true, data: restored });
});
