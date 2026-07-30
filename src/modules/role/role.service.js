const pool = require('../../db/pool');
const { getPagination } = require('../../utils/helpers');

async function assignPermissions(client, roleId, permissionIds) {
  await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
  for (const pid of permissionIds) {
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleId, pid]
    );
  }
}

async function createRole({ name, description, status, permissionIds, grantAll }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roleRes = await client.query(
      `INSERT INTO roles (name, description, status) VALUES ($1, $2, $3) RETURNING *`,
      [name, description || null, status]
    );
    const role = roleRes.rows[0];

    let ids = permissionIds;
    if (grantAll) {
      const { rows } = await client.query(`SELECT id FROM permissions`);
      ids = rows.map((r) => r.id);
    }
    await assignPermissions(client, role.id, ids);
    await client.query('COMMIT');
    return getRole(role.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listRoles({ page, limit, search }) {
  const { offset } = getPagination(page, limit);
  const s = search ? `%${search}%` : null;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM roles WHERE ($1::text IS NULL OR name ILIKE $1)`, [s]
  );

  const { rows } = await pool.query(
    `SELECT r.*, COUNT(u.id)::int AS user_count
     FROM roles r
     LEFT JOIN users u ON u.role_id = r.id
     WHERE ($1::text IS NULL OR r.name ILIKE $1)
     GROUP BY r.id
     ORDER BY r.name
     LIMIT $2 OFFSET $3`,
    [s, limit, offset]
  );

  return { data: rows, total: parseInt(countRes.rows[0].count) };
}

async function getRole(id) {
  const { rows } = await pool.query(`SELECT * FROM roles WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  const role = rows[0];

  const { rows: perms } = await pool.query(
    `SELECT p.id, p.name, p.description, pg.name AS group_name
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN permission_groups pg ON pg.id = p.group_id
     WHERE rp.role_id = $1`,
    [id]
  );
  return { ...role, permissions: perms };
}

async function updateRole(id, { name, description, status, permissionIds, grantAll }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(`SELECT * FROM roles WHERE id = $1`, [id]);
    if (!existing.rows[0]) throw { status: 404, message: 'Role not found' };

    // Guard: don't strip role:update from the only role that has it
    if (permissionIds !== undefined) {
      const { rows: roleUpdatePerm } = await client.query(
        `SELECT p.id FROM permissions p WHERE p.name = 'role:update'`
      );
      if (roleUpdatePerm[0]) {
        const permId = roleUpdatePerm[0].id;
        const willHave = grantAll || (permissionIds || []).includes(permId);
        if (!willHave) {
          const { rows: others } = await client.query(
            `SELECT rp.role_id FROM role_permissions rp WHERE rp.permission_id = $1 AND rp.role_id != $2`,
            [permId, id]
          );
          if (!others.length) throw { status: 422, message: 'Cannot remove role:update from the only role that holds it' };
        }
      }
    }

    await client.query(
      `UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description),
       status = COALESCE($3, status), updated_at = NOW() WHERE id = $4`,
      [name, description, status, id]
    );

    if (permissionIds !== undefined || grantAll) {
      let ids = permissionIds || [];
      if (grantAll) {
        const { rows } = await client.query(`SELECT id FROM permissions`);
        ids = rows.map((r) => r.id);
      }
      await assignPermissions(client, id, ids);
    }

    await client.query('COMMIT');
    return getRole(id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteRole(id) {
  const { rows: users } = await pool.query(`SELECT id FROM users WHERE role_id = $1 LIMIT 1`, [id]);
  if (users.length) throw { status: 409, message: 'Cannot delete role while users are assigned to it' };

  const { rows } = await pool.query(`DELETE FROM roles WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = { createRole, listRoles, getRole, updateRole, deleteRole };
