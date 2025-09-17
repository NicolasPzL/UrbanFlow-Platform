// models/roleModel.js
import pool from '../config/db.js';

// Roles protegidos del sistema (no se pueden eliminar)
export const PROTECTED_ROLES = ['admin'];

// Proyección pública uniforme
function toPublic(r) {
  if (!r) return null;
  const { rol_id, nombre_rol, descripcion, is_active, creado_en, actualizado_en, deleted_at } = r;
  return { rol_id, nombre_rol, descripcion, is_active, creado_en, actualizado_en, deleted_at };
}

// Crear rol
export async function createRole({ nombre_rol, descripcion = null, is_active = true }) {
  const q = `
    INSERT INTO roles (nombre_rol, descripcion, is_active)
    VALUES ($1,$2,$3)
    RETURNING *
  `;
  try {
    const { rows } = await pool.query(q, [nombre_rol?.trim(), descripcion, is_active]);
    return toPublic(rows[0]);
  } catch (e) {
    if (e.code === '23505') { // unique_violation (nombre_rol)
      const err = new Error('El nombre del rol ya existe'); err.status = 409; throw err;
    }
    throw e;
  }
}

// Obtener por id (con o sin eliminados)
export async function findById(rol_id, { includeDeleted = false } = {}) {
  const where = includeDeleted ? 'rol_id = $1' : 'rol_id = $1 AND deleted_at IS NULL';
  const { rows } = await pool.query(`SELECT * FROM roles WHERE ${where}`, [rol_id]);
  return toPublic(rows[0] || null);
}

// Obtener por nombre (útil para “admin”)
export async function findByName(nombre_rol, { includeDeleted = false } = {}) {
  const where = includeDeleted ? 'nombre_rol = $1' : 'nombre_rol = $1 AND deleted_at IS NULL';
  const { rows } = await pool.query(`SELECT * FROM roles WHERE ${where}`, [nombre_rol?.trim()]);
  return toPublic(rows[0] || null);
}

// Listar con filtros + paginación
export async function list({
  search = '',
  isActive = null,
  includeDeleted = false,
  limit = 20,
  offset = 0,
  sortBy = 'rol_id',     // rol_id | nombre_rol | creado_en
  sortDir = 'asc'
} = {}) {
  const sortCols = { rol_id: 'rol_id', nombre_rol: 'nombre_rol', creado_en: 'creado_en' };
  const sCol = sortCols[sortBy] || 'rol_id';
  const sDir = sortDir?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const where = [];
  const args = [];
  let i = 1;

  if (!includeDeleted) where.push('deleted_at IS NULL');
  if (search) { where.push(`(nombre_rol ILIKE $${i} OR COALESCE(descripcion,'') ILIKE $${i})`); args.push(`%${search}%`); i++; }
  if (isActive !== null) { where.push(`is_active = $${i}`); args.push(Boolean(isActive)); i++; }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const q = `
    SELECT *, COUNT(*) OVER() AS total
      FROM roles
      ${whereSql}
     ORDER BY ${sCol} ${sDir}
     LIMIT $${i} OFFSET $${i + 1}
  `;
  args.push(limit, offset);

  const { rows } = await pool.query(q, args);
  const total = rows[0]?.total ? Number(rows[0].total) : 0;
  return { total, items: rows.map(toPublic) };
}

// Actualizar (parcial)
export async function updateRole(rol_id, { nombre_rol, descripcion, is_active }) {
  const sets = [];
  const args = [];
  let i = 1;

  if (nombre_rol !== undefined) { sets.push(`nombre_rol = $${i++}`); args.push(nombre_rol?.trim()); }
  if (descripcion !== undefined) { sets.push(`descripcion = $${i++}`); args.push(descripcion); }
  if (is_active !== undefined)   { sets.push(`is_active = $${i++}`);   args.push(Boolean(is_active)); }
  if (!sets.length) return findById(rol_id);

  const q = `UPDATE roles SET ${sets.join(', ')} WHERE rol_id = $${i} AND deleted_at IS NULL RETURNING *`;
  args.push(rol_id);

  try {
    const { rows } = await pool.query(q, args);
    return toPublic(rows[0] || null);
  } catch (e) {
    if (e.code === '23505') { const err = new Error('El nombre del rol ya existe'); err.status = 409; throw err; }
    throw e;
  }
}

// Soft delete (no borrar roles protegidos)
export async function softDeleteRole(rol_id) {
  const role = await findById(rol_id, { includeDeleted: true });
  if (!role) return null;
  if (PROTECTED_ROLES.includes(role.nombre_rol)) {
    const err = new Error(`El rol "${role.nombre_rol}" es protegido y no puede eliminarse`); err.status = 403; throw err;
  }
  const { rows } = await pool.query(
    `UPDATE roles SET deleted_at = NOW(), is_active = false WHERE rol_id = $1 AND deleted_at IS NULL RETURNING *`,
    [rol_id]
  );
  return toPublic(rows[0] || null);
}

// Hard delete (solo si no está asignado a nadie)
export async function hardDeleteRole(rol_id) {
  const role = await findById(rol_id, { includeDeleted: true });
  if (!role) return false;
  if (PROTECTED_ROLES.includes(role.nombre_rol)) {
    const err = new Error(`El rol "${role.nombre_rol}" es protegido y no puede eliminarse`); err.status = 403; throw err;
  }
  const { rows } = await pool.query(
    `SELECT 1 FROM rol_usuario WHERE rol_id = $1 LIMIT 1`, [rol_id]
  );
  if (rows[0]) { const err = new Error('No puede eliminarse: hay usuarios con este rol'); err.status = 409; throw err; }
  const { rowCount } = await pool.query(`DELETE FROM roles WHERE rol_id = $1`, [rol_id]);
  return rowCount > 0;
}
