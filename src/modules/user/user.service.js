const bcrypt = require('bcrypt');
const pool = require('../../db/pool');
const { getPagination } = require('../../utils/helpers');

const safeUser = (u) => {
  const { password, refresh_token, ...rest } = u;
  return rest;
};

async function createUser({ name, email, password, phone, gender, roleId, isActive }) {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password, phone, gender, role_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, email, hash, phone || null, gender || null, roleId, isActive]
  );
  return safeUser(rows[0]);
}

async function listUsers({ page, limit, search, roleId, isActive }) {
  const { offset } = getPagination(page, limit);
  const s = search ? `%${search}%` : null;

  const conditions = [];
  const params = [s, limit, offset];
  let idx = 4;

  let where = `WHERE ($1::text IS NULL OR u.name ILIKE $1 OR u.email ILIKE $1)`;
  if (roleId) { where += ` AND u.role_id = $${idx}`; params.push(roleId); idx++; }
  if (isActive !== undefined) { where += ` AND u.is_active = $${idx}`; params.push(isActive); idx++; }

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM users u ${where}`, params.slice(0, idx - 3)
  );

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.gender, u.avatar, u.is_active, u.created_at,
            r.id AS role_id, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    params
  );

  return { data: rows, total: parseInt(countRes.rows[0].count) };
}

async function getUser(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.gender, u.avatar, u.is_active, u.created_at,
            r.id AS role_id, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateUser(id, requesterId, { name, email, password, phone, gender, roleId, isActive }) {
  if (id === requesterId && roleId !== undefined) {
    throw { status: 403, message: 'Cannot change your own role' };
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
  if (email !== undefined) { updates.push(`email = $${idx++}`); params.push(email); }
  if (password !== undefined) { updates.push(`password = $${idx++}`); params.push(await bcrypt.hash(password, 12)); }
  if (phone !== undefined) { updates.push(`phone = $${idx++}`); params.push(phone); }
  if (gender !== undefined) { updates.push(`gender = $${idx++}`); params.push(gender); }
  if (roleId !== undefined) { updates.push(`role_id = $${idx++}`); params.push(roleId); }
  if (isActive !== undefined) { updates.push(`is_active = $${idx++}`); params.push(isActive); }

  if (!updates.length) throw { status: 400, message: 'No fields to update' };

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (!rows[0]) throw { status: 404, message: 'User not found' };
  return safeUser(rows[0]);
}

async function deleteUser(id) {
  const { rows } = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = { createUser, listUsers, getUser, updateUser, deleteUser };
