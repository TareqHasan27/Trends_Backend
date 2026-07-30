const pool = require('../../db/pool');
const { getPagination } = require('../../utils/helpers');

const normalizeName = (name) => name.toLowerCase().replace(/\s+/g, '_');

async function createGroup(name, description, actions) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const groupRes = await client.query(
      `INSERT INTO permission_groups (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description || null]
    );
    const group = groupRes.rows[0];
    const prefix = normalizeName(name);
    const perms = [];
    for (const action of actions) {
      const permName = `${prefix}:${normalizeName(action)}`;
      const pRes = await client.query(
        `INSERT INTO permissions (name, group_id) VALUES ($1, $2) RETURNING *`,
        [permName, group.id]
      );
      perms.push(pRes.rows[0]);
    }
    await client.query('COMMIT');
    return { ...group, permissions: perms };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listGroups({ page, limit, search }) {
  const { offset } = getPagination(page, limit);
  const searchParam = search ? `%${search}%` : null;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM permission_groups WHERE ($1::text IS NULL OR name ILIKE $1)`,
    [searchParam]
  );

  const { rows } = await pool.query(
    `SELECT pg.*, json_agg(json_build_object('id', p.id, 'name', p.name, 'description', p.description) ORDER BY p.name) AS permissions
     FROM permission_groups pg
     LEFT JOIN permissions p ON p.group_id = pg.id
     WHERE ($1::text IS NULL OR pg.name ILIKE $1)
     GROUP BY pg.id
     ORDER BY pg.name
     LIMIT $2 OFFSET $3`,
    [searchParam, limit, offset]
  );

  return { data: rows, total: parseInt(countRes.rows[0].count) };
}

async function getGroup(id) {
  const { rows } = await pool.query(
    `SELECT pg.*, json_agg(json_build_object('id', p.id, 'name', p.name, 'description', p.description) ORDER BY p.name) AS permissions
     FROM permission_groups pg
     LEFT JOIN permissions p ON p.group_id = pg.id
     WHERE pg.id = $1
     GROUP BY pg.id`,
    [id]
  );
  return rows[0] || null;
}

async function updateGroup(id, { name, description, actions }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(`SELECT * FROM permission_groups WHERE id = $1`, [id]);
    if (!existing.rows[0]) throw { status: 404, message: 'Permission group not found' };

    const groupName = name || existing.rows[0].name;
    await client.query(
      `UPDATE permission_groups SET name = $1, description = $2, updated_at = NOW() WHERE id = $3`,
      [groupName, description ?? existing.rows[0].description, id]
    );

    if (actions) {
      const prefix = normalizeName(groupName);
      // Remove old permissions not in new list
      const newNames = actions.map((a) => `${prefix}:${normalizeName(a)}`);
      await client.query(
        `DELETE FROM permissions WHERE group_id = $1 AND name != ALL($2::text[])`,
        [id, newNames]
      );
      // Add new ones
      for (const permName of newNames) {
        await client.query(
          `INSERT INTO permissions (name, group_id) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
          [permName, id]
        );
      }
    }

    await client.query('COMMIT');
    return getGroup(id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteGroup(id) {
  const { rows } = await pool.query(`DELETE FROM permission_groups WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = { createGroup, listGroups, getGroup, updateGroup, deleteGroup };
