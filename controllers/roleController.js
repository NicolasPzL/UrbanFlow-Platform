import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import * as Roles from '../models/rolModel.js';
import * as Audit from '../models/auditoriaModel.js';

export const list = asyncHandler(async (req, res) => {
  const { search, isActive, includeDeleted, limit, offset, sortBy, sortDir } = req.query;
  const data = await Roles.list({
    search: search || '',
    isActive: isActive === undefined ? null : isActive === 'true',
    includeDeleted: includeDeleted === 'true',
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
    sortBy: sortBy || 'rol_id',
    sortDir: sortDir || 'asc'
  });
  res.json({ ok: true, data: data.items, meta: { total: data.total, limit: Number(limit) || 20, offset: Number(offset) || 0 } });
});

export const create = asyncHandler(async (req, res) => {
  const { nombre_rol } = req.body;
  if (!nombre_rol) throw new AppError('Datos inválidos', { status: 400, code: 'VALIDATION_ERROR' });

  const role = await Roles.createRole(req.body);
  await Audit.log({ usuario_id: req.user.id, accion: 'CREATE_ROLE', detalles: { rol_id: role.rol_id } });
  res.status(201).json({ ok: true, data: role });
});

export const update = asyncHandler(async (req, res) => {
  const role = await Roles.updateRole(req.params.id, req.body);
  if (!role) throw new AppError('No encontrado', { status: 404, code: 'NOT_FOUND' });

  await Audit.log({ usuario_id: req.user.id, accion: 'UPDATE_ROLE', detalles: { rol_id: req.params.id, cambios: req.body } });
  res.json({ ok: true, data: role });
});

export const softDelete = asyncHandler(async (req, res) => {
  const role = await Roles.softDeleteRole(req.params.id);
  if (!role) throw new AppError('No encontrado', { status: 404, code: 'NOT_FOUND' });

  await Audit.log({ usuario_id: req.user.id, accion: 'DELETE_ROLE', detalles: { rol_id: req.params.id } });
  res.json({ ok: true, data: role });
});