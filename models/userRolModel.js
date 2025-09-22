// models/userRoleModel.js
import pool from '../config/db.js';
import { PROTECTED_ROLES, findByName as findRoleByName } from './rolModel.js';

// ---- Lecturas básicas
export async function getUserRoles(usuario_id) {
  const { rows } = await pool.query(
    `SELECT r.rol_id, r.nombre_rol, r.descripcion
       FROM rol_usuario ur
       JOIN roles r ON r.rol_id = ur.rol_id
      WHERE ur.usuario_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.rol_id`,
    [usuario_id]
  );
  return rows;
}

export async function getUsersByRole(rol_id, { limit = 20, offset = 0 } = {}) {
  const q = `
    SELECT u.usuario_id, u.nombre, u.correo,
           COUNT(*) OVER() AS total
      FROM rol_usuario ur
      JOIN usuarios u ON u.usuario_id = ur.usuario_id
     WHERE ur.rol_id = $1
     ORDER BY u.usuario_id DESC
     LIMIT $2 OFFSET $3
  `;
  const { rows } = await pool.query(q, [rol_id, limit, offset]);
  const total = rows[0]?.total ? Number(rows[0].total) : 0;
  return { total, items: rows.map(({ total: _t, ...r }) => r) };
}

export async function hasRole(usuario_id, rol_id) {
  const { rows } = await pool.query(
    `SELECT 1 FROM rol_usuario WHERE usuario_id = $1 AND rol_id = $2 LIMIT 1`,
    [usuario_id, rol_id]
  );
  return !!rows[0];
}

// ---- Helpers internos
async function countAdmins(client) {
  const { rows } = await client.query(
    `SELECT COUNT(DISTINCT ur.usuario_id)::int AS c
       FROM rol_usuario ur
       JOIN roles r ON r.rol_id = ur.rol_id
      WHERE r.nombre_rol = 'admin' AND r.deleted_at IS NULL`
  );
  return rows[0].c;
}
async function userIsAdmin(client, usuario_id) {
  const { rows } = await client.query(
    `SELECT 1
       FROM rol_usuario ur
       JOIN roles r ON r.rol_id = ur.rol_id
      WHERE ur.usuario_id = $1 AND r.nombre_rol = 'admin' AND r.deleted_at IS NULL
      LIMIT 1`,
    [usuario_id]
  );
  return !!rows[0];
}

// ---- Asignar rol (idempotente)
export async function assignRoleSafe({ targetUserId, roleIdOrName, actorUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(42001)'); // lock lógico global de roles

    // Resolver rol_id por nombre si viene string
    let rol_id = roleIdOrName;
    if (typeof roleIdOrName === 'string') {
      const r = await findRoleByName(roleIdOrName, { includeDeleted: false });
      if (!r) { const e = new Error('Rol no existe'); e.status = 404; throw e; }
      rol_id = r.rol_id;
    }

    await client.query(
      `INSERT INTO rol_usuario (usuario_id, rol_id)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`, [targetUserId, rol_id]
    );

    await client.query('COMMIT');
    return getUserRoles(targetUserId);
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
}

// ---- Quitar rol con reglas: no auto-degradarse ni dejar 0 admins
export async function removeRoleSafe({ targetUserId, roleIdOrName, actorUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(42001)');

    // Resolver rol
    let role = null;
    if (typeof roleIdOrName === 'string') {
      role = await findRoleByName(roleIdOrName, { includeDeleted: false });
    } else {
      const { rows } = await client.query(`SELECT * FROM roles WHERE rol_id=$1 AND deleted_at IS NULL`, [roleIdOrName]);
      role = rows[0] || null;
    }
    if (!role) { const e = new Error('Rol no existe'); e.status = 404; throw e; }

    // Si es admin: aplicar reglas
    if (role.nombre_rol === 'admin') {
      if (actorUserId === targetUserId) {
        const e = new Error('No puedes quitarte tu propio rol admin'); e.status = 403; throw e;
      }
      const targetIsAdmin = await userIsAdmin(client, targetUserId);
      if (targetIsAdmin) {
        const admins = await countAdmins(client);
        if (admins <= 1) {
          const e = new Error('No puedes remover el último admin del sistema'); e.status = 403; throw e;
        }
      }
    }

    await client.query(`DELETE FROM rol_usuario WHERE usuario_id=$1 AND rol_id=$2`, [targetUserId, role.rol_id]);

    await client.query('COMMIT');
    return getUserRoles(targetUserId);
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
}
