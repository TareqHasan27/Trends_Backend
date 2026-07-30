const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');

const INVALID_CREDENTIALS = 'Invalid email or password';

const signAccess = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const signRefresh = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

async function login(email, password) {
  const { rows } = await pool.query(
    `SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user) throw { status: 401, message: INVALID_CREDENTIALS };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: INVALID_CREDENTIALS };

  if (!user.is_active) throw { status: 401, message: INVALID_CREDENTIALS };

  const accessToken = signAccess(user.id);
  const refreshToken = signRefresh(user.id);

  await pool.query(`UPDATE users SET refresh_token = $1 WHERE id = $2`, [refreshToken, user.id]);

  return { accessToken, refreshToken };
}

async function refresh(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token' };
  }

  const { rows } = await pool.query(
    `SELECT * FROM users WHERE id = $1 AND refresh_token = $2`,
    [payload.sub, token]
  );
  const user = rows[0];
  if (!user) throw { status: 401, message: 'Invalid refresh token' };
  if (!user.is_active) throw { status: 401, message: 'Account is inactive' };

  const accessToken = signAccess(user.id);
  const newRefresh = signRefresh(user.id);
  await pool.query(`UPDATE users SET refresh_token = $1 WHERE id = $2`, [newRefresh, user.id]);

  return { accessToken, refreshToken: newRefresh };
}

async function logout(userId) {
  await pool.query(`UPDATE users SET refresh_token = NULL WHERE id = $1`, [userId]);
}

async function getSession(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.gender, u.avatar, u.is_active,
            r.id AS role_id, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user) throw { status: 404, message: 'User not found' };

  const { rows: perms } = await pool.query(
    `SELECT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = $1`,
    [user.role_id]
  );

  return { ...user, permissions: perms.map((p) => p.name) };
}

module.exports = { login, refresh, logout, getSession };
