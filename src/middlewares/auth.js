const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { error } = require('../utils/helpers');

const authGuard = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 401, 'Authentication required');
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return error(res, 401, 'Invalid or expired token');
  }

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active, u.role_id,
            r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [payload.sub]
  );

  const user = rows[0];
  if (!user) return error(res, 401, 'User not found');
  if (!user.is_active) return error(res, 401, 'Account is inactive');

  req.user = user;
  next();
};

const requirePermission = (permName) => async (req, res, next) => {
  const { rows } = await pool.query(
    `SELECT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = $1 AND p.name = $2`,
    [req.user.role_id, permName]
  );
  if (!rows.length) return error(res, 403, 'Forbidden: insufficient permissions');
  next();
};

module.exports = { authGuard, requirePermission };
