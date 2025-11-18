import pool from '../config/db.js';


function toPublic(u) {
  if (!u) return null;
  const {
    usuario_id, nombre, correo, rol, is_active,
    creado_en, actualizado_en, deleted_at,
    last_login_at, password_updated_at, must_change_password, failed_attempts, locked_until
  } = u;
  return {
    usuario_id, nombre, correo, rol, is_active,
    creado_en, actualizado_en, deleted_at,
    last_login_at, password_updated_at, must_change_password, failed_attempts, locked_until
  };
}

// --- Crear
export async function createUser({ nombre, correo, passwordHash, rol = 'usuario', mustChangePassword = false }) {
  const q = `
    INSERT INTO usuarios (nombre, correo, password_hash, rol, must_change_password)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING usuario_id, nombre, correo, rol, is_active,
              creado_en, actualizado_en, deleted_at,
              last_login_at, password_updated_at, must_change_password,
              failed_attempts, locked_until
  `;
  try {
    const { rows } = await pool.query(q, [nombre, correo, passwordHash, rol, mustChangePassword]);
    return toPublic(rows[0]);
  } catch (e) {
    // 23505 = unique_violation
    if (e.code === '23505') {
      const err = new Error('El correo ya está registrado');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

// --- Lecturas
export async function findByEmail(correo, { includeDeleted = false } = {}) {
  const query = includeDeleted
    ? `SELECT * FROM usuarios WHERE LOWER(correo) = LOWER($1) LIMIT 1`
    : `SELECT * FROM usuarios WHERE LOWER(correo) = LOWER($1) AND deleted_at IS NULL LIMIT 1`;
  const { rows } = await pool.query(query, [correo]);
  return rows[0] || null; // contiene password_hash, se debe usar solo para server
}

export async function findById(id, { includeDeleted = false } = {}) {
  const where = includeDeleted ? 'usuario_id = $1' : 'usuario_id = $1 AND deleted_at IS NULL';
  const { rows } = await pool.query(
    `SELECT * FROM usuarios WHERE ${where}`, [id]
  );
  return toPublic(rows[0] || null);
}

// --- Listado con filtros + paginación
export async function list({
  search = '',
  rol = null,
  isActive = null,
  includeDeleted = false,
  limit = 20,
  offset = 0,
  sortBy = 'usuario_id',   
  sortDir = 'desc'         
} = {}) {
  const sortCols = { usuario_id: 'usuario_id', nombre: 'nombre', correo: 'correo', creado_en: 'creado_en' };
  const sCol = sortCols[sortBy] || 'usuario_id';
  const sDir = sortDir?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const whereParts = [];
  const args = [];
  let i = 1;

  if (!includeDeleted) { whereParts.push(`deleted_at IS NULL`); }
  if (search) { whereParts.push(`(nombre ILIKE $${i} OR correo ILIKE $${i})`); args.push(`%${search}%`); i++; }
  if (rol)    { whereParts.push(`rol = $${i}`); args.push(rol); i++; }
  if (isActive !== null) { whereParts.push(`is_active = $${i}`); args.push(Boolean(isActive)); i++; }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const q = `
    SELECT
      usuario_id, nombre, correo, rol, is_active, creado_en, actualizado_en,
      deleted_at, last_login_at, password_updated_at, must_change_password,
      failed_attempts, locked_until,
      COUNT(*) OVER() AS total
    FROM usuarios
    ${whereSql}
    ORDER BY ${sCol} ${sDir}
    LIMIT $${i} OFFSET $${i + 1}
  `;
  args.push(limit, offset);

  const { rows } = await pool.query(q, args);
  const total = rows[0]?.total ? Number(rows[0].total) : 0;
  return {
    total,
    items: rows.map(toPublic)
  };
}

// --- Actualizar (parcial) con soporte a cambio de contraseña
export async function updateUser(id, { nombre, correo, rol, passwordHash = null, is_active = null, must_change_password = null }) {
  const sets = [];
  const args = [];
  let i = 1;

  if (nombre !== undefined) { sets.push(`nombre = $${i++}`); args.push(nombre); }
  if (correo !== undefined) { sets.push(`correo = $${i++}`); args.push(correo); }
  if (rol !== undefined)    { sets.push(`rol    = $${i++}`); args.push(rol); }
  if (is_active !== null && is_active !== undefined) { sets.push(`is_active = $${i++}`); args.push(is_active); }
  if (must_change_password !== null && must_change_password !== undefined) {
    sets.push(`must_change_password = $${i++}`); args.push(must_change_password);
  }
  if (passwordHash) {
    sets.push(`password_hash = $${i++}`);
    sets.push(`password_updated_at = NOW()`);
    args.push(passwordHash);
  }

  if (!sets.length) return findById(id);

  const q = `
    UPDATE usuarios
       SET ${sets.join(', ')}
     WHERE usuario_id = $${i} AND deleted_at IS NULL
     RETURNING *
  `;
  args.push(id);

  try {
    const { rows } = await pool.query(q, args);
    return toPublic(rows[0] || null);
  } catch (e) {
    if (e.code === '23505') {
      const err = new Error('El correo ya está registrado');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

// --- Soft delete (no borra físico)
export async function softDeleteUser(id) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET deleted_at = NOW(), is_active = false WHERE usuario_id = $1 AND deleted_at IS NULL RETURNING *`, [id]
  );
  return toPublic(rows[0] || null);
}

export async function restoreUser(id) {
  const { rows } = await pool.query(
    `UPDATE usuarios
        SET deleted_at = NULL,
            is_active = true
      WHERE usuario_id = $1
        AND deleted_at IS NOT NULL
    RETURNING *`,
    [id]
  );
  return toPublic(rows[0] || null);
}

// --- Hard delete (si realmente lo necesitas)
export async function hardDeleteUser(id) {
  const { rowCount } = await pool.query(`DELETE FROM usuarios WHERE usuario_id = $1`, [id]);
  return rowCount > 0;
}

// --- Seguridad: registrar login OK / fallo / lock & unlock
export async function recordSuccessfulLogin(id) {
  await pool.query(
    `UPDATE usuarios
        SET last_login_at = NOW(),
            failed_attempts = 0,
            locked_until = NULL
      WHERE usuario_id = $1 AND deleted_at IS NULL`,
    [id]
  );
}

export async function recordFailedLogin(id, { lockAfter = 5, lockMinutes = 15 } = {}) {
  // incrementa y bloquea si excede
  const { rows } = await pool.query(
    `UPDATE usuarios
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE
              WHEN failed_attempts + 1 >= $2 THEN NOW() + ($3 || ' minutes')::interval
              ELSE locked_until
            END
      WHERE usuario_id = $1 AND deleted_at IS NULL
      RETURNING failed_attempts, locked_until`,
    [id, lockAfter, String(lockMinutes)]
  );
  return rows[0] || null;
}

export async function unlockUser(id) {
  const { rows } = await pool.query(
    `UPDATE usuarios
        SET failed_attempts = 0,
            locked_until = NULL,
            is_active = true
      WHERE usuario_id = $1 AND deleted_at IS NULL
      RETURNING *`,
    [id]
  );
  return toPublic(rows[0] || null);
}