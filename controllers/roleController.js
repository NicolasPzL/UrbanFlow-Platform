import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import * as Roles from '../models/rolModel.js';
import { auditEvent } from '../middlewares/audit.js';

// Roles predefinidos según el documento
const PREDEFINED_ROLES = {
  ADMIN: 'admin',
  USER: 'usuario'
};

export const list = asyncHandler(async (req, res) => {
  // Solo permitir listar los roles predefinidos
  const predefinedRoles = await Roles.getPredefinedRoles();
  
  res.json({ 
    ok: true, 
    data: predefinedRoles, 
    meta: { 
      total: predefinedRoles.length, 
      limit: predefinedRoles.length, 
      offset: 0 
    } 
  });
});

export const getById = asyncHandler(async (req, res) => {
  const role = await Roles.getRoleById(req.params.id);
  if (!role) throw new AppError('Rol no encontrado', { status: 404, code: 'NOT_FOUND' });
  
  res.json({ ok: true, data: role });
});

// CREATE deshabilitado para roles predefinidos
export const create = asyncHandler(async (req, res) => {
  throw new AppError('No se pueden crear nuevos roles. Use los roles predefinidos: admin, usuario', { 
    status: 403, 
    code: 'ROLES_LOCKED' 
  });
});

// UPDATE limitado para no modificar roles predefinidos críticos
export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre_rol, descripcion } = req.body;
  
  // Verificar si es un rol predefinido
  const role = await Roles.getRoleById(id);
  if (!role) throw new AppError('Rol no encontrado', { status: 404, code: 'NOT_FOUND' });
  
  if (role.nombre_rol === PREDEFINED_ROLES.ADMIN || role.nombre_rol === PREDEFINED_ROLES.USER) {
    throw new AppError('No se pueden modificar los roles predefinidos del sistema', { 
      status: 403, 
      code: 'PREDEFINED_ROLE' 
    });
  }
  
  const updatedRole = await Roles.updateRole(id, { descripcion }); // Solo permitir cambiar descripción
  await auditEvent({
    event: 'ROLE_UPDATE',
    actorId: req.user.id ?? null,
    actorEmail: req.user.email ?? null,
    ip: req.ip ?? null,
    metadata: { rol_id: id, cambios: req.body },
  });
  
  res.json({ ok: true, data: updatedRole });
});

// SOFT DELETE deshabilitado para roles predefinidos
export const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const role = await Roles.getRoleById(id);
  if (!role) throw new AppError('Rol no encontrado', { status: 404, code: 'NOT_FOUND' });
  
  if (role.nombre_rol === PREDEFINED_ROLES.ADMIN || role.nombre_rol === PREDEFINED_ROLES.USER) {
    throw new AppError('No se pueden eliminar los roles predefinidos del sistema', { 
      status: 403, 
      code: 'PREDEFINED_ROLE' 
    });
  }
  
  const deletedRole = await Roles.softDeleteRole(id);
  await auditEvent({
    event: 'ROLE_DELETE',
    actorId: req.user.id ?? null,
    actorEmail: req.user.email ?? null,
    ip: req.ip ?? null,
    metadata: { rol_id: id },
  });
  
  res.json({ ok: true, data: deletedRole });
});

// Nuevo método para obtener roles predefinidos específicos
export const getPredefinedRoles = asyncHandler(async (req, res) => {
  const predefinedRoles = await Roles.getPredefinedRoles();
  res.json({ ok: true, data: predefinedRoles });
});