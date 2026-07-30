const pool = require('../../db/pool');
const { getPagination } = require('../../utils/helpers');

async function createBrand({ name, slug, logoId, status, description }) {
  const { rows } = await pool.query(
    `INSERT INTO brands (name, slug, logo_id, status, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, slug, logoId || null, status, description || null]
  );
  return rows[0];
}

async function listBrands({ page, limit, search, status }) {
  const { offset } = getPagination(page, limit);
  const s = search ? `%${search}%` : null;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM brands WHERE ($1::text IS NULL OR name ILIKE $1) AND ($2::text IS NULL OR status = $2)`,
    [s, status || null]
  );

  const { rows } = await pool.query(
    `SELECT b.*, m.public_url AS logo_url FROM brands b
     LEFT JOIN media m ON m.id = b.logo_id
     WHERE ($1::text IS NULL OR b.name ILIKE $1) AND ($2::text IS NULL OR b.status = $2)
     ORDER BY b.name LIMIT $3 OFFSET $4`,
    [s, status || null, limit, offset]
  );

  return { data: rows, total: parseInt(countRes.rows[0].count) };
}

async function getBrand(id) {
  const { rows } = await pool.query(
    `SELECT b.*, m.public_url AS logo_url FROM brands b LEFT JOIN media m ON m.id = b.logo_id WHERE b.id = $1`, [id]
  );
  return rows[0] || null;
}

async function updateBrand(id, { name, slug, logoId, status, description }) {
  const { rows } = await pool.query(
    `UPDATE brands SET name = COALESCE($1, name), slug = COALESCE($2, slug),
     logo_id = COALESCE($3, logo_id), status = COALESCE($4, status),
     description = COALESCE($5, description), updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [name, slug, logoId, status, description, id]
  );
  return rows[0] || null;
}

async function deleteBrand(id) {
  const { rows: products } = await pool.query(`SELECT id FROM products WHERE brand_id = $1 LIMIT 1`, [id]);
  if (products.length) throw { status: 409, message: 'Cannot delete brand while products reference it' };

  const { rows } = await pool.query(`DELETE FROM brands WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = { createBrand, listBrands, getBrand, updateBrand, deleteBrand };
