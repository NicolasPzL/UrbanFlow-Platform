// models/auditModel.js
import pool from '../config/db.js';

function toPublic(r) {
  if (!r) return null;
  const { log_id, usuario_id, accion, detalles, timestamp_log } = r;
  return { log_id, usuario_id, accion, detalles: detalles ?? null, timestamp_log };
}

/**
 * Registrar evento (append-only)
 * @param {number|null} usuario_id
 * @param {string} accion  - 'LOGIN','LOGOUT','CREATE','UPDATE','DELETE','ASSIGN_ROLE','REMOVE_ROLE',...
 * @param {object|null} detalles - JSONB
 */
export async function log({ usuario_id = null, accion, detalles = null }) {
  await pool.query(
    `INSERT INTO audit_log (usuario_id, accion, detalles, timestamp_log)
     VALUES ($1,$2,$3,NOW())`,
    [usuario_id, accion, detalles]
  );
}

// Listado con filtros, búsqueda y paginación
export async function list({
  usuario_id = null,
  accion = null,
  search = '',      // busca en texto de JSON detalles
  from = null,
  to = null,
  limit = 50,
  offset = 0,
  sortDir = 'desc'
} = {}) {
  const sDir = sortDir?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  const where = [];
  const args = [];
  let i = 1;

  if (usuario_id !== null) { where.push(`usuario_id = $${i++}`); args.push(usuario_id); }
  if (accion) { where.push(`accion = $${i++}`); args.push(accion); }
  if (from)  { where.push(`timestamp_log >= $${i++}`); args.push(new Date(from)); }
  if (to)    { where.push(`timestamp_log <= $${i++}`); args.push(new Date(to)); }
  if (search) {
    // cast a texto para búsqueda full-text básica (puedes mejorar con GIN jsonb_path_ops)
    where.push(`detalles::text ILIKE $${i++}`); args.push(`%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const q = `
    SELECT log_id, usuario_id, accion, detalles, timestamp_log,
           COUNT(*) OVER() AS total
      FROM audit_log
      ${whereSql}
     ORDER BY timestamp_log ${sDir}
     LIMIT $${i} OFFSET $${i + 1}
  `;
  args.push(limit, offset);

  const { rows } = await pool.query(q, args);
  const total = rows[0]?.total ? Number(rows[0].total) : 0;
  return { total, items: rows.map(toPublic) };
}
