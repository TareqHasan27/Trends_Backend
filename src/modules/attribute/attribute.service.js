const pool = require('../../db/pool');
const { getPagination } = require('../../utils/helpers');

async function createAttribute({ name, slug, type }) {
  const { rows } = await pool.query(
    `INSERT INTO attributes (name, slug, type) VALUES ($1, $2, $3) RETURNING *`,
    [name, slug, type]
  );
  return rows[0];
}

async function listAttributes({ page, limit, search }) {
  const { offset } = getPagination(page, limit);
  const s = search ? `%${search}%` : null;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM attributes WHERE ($1::text IS NULL OR name ILIKE $1)`, [s]
  );

  const { rows } = await pool.query(
    `SELECT a.*, json_agg(json_build_object('id', av.id, 'value', av.value, 'slug', av.slug, 'referenceValue', av.reference_value) ORDER BY av.value) FILTER (WHERE av.id IS NOT NULL) AS values
     FROM attributes a
     LEFT JOIN attribute_values av ON av.attribute_id = a.id
     WHERE ($1::text IS NULL OR a.name ILIKE $1)
     GROUP BY a.id ORDER BY a.name LIMIT $2 OFFSET $3`,
    [s, limit, offset]
  );

  return { data: rows, total: parseInt(countRes.rows[0].count) };
}

async function getAttribute(id) {
  const { rows } = await pool.query(
    `SELECT a.*, json_agg(json_build_object('id', av.id, 'value', av.value, 'slug', av.slug, 'referenceValue', av.reference_value) ORDER BY av.value) FILTER (WHERE av.id IS NOT NULL) AS values
     FROM attributes a
     LEFT JOIN attribute_values av ON av.attribute_id = a.id
     WHERE a.id = $1 GROUP BY a.id`,
    [id]
  );
  return rows[0] || null;
}

async function updateAttribute(id, { name, slug, type }) {
  const { rows } = await pool.query(
    `UPDATE attributes SET name = COALESCE($1, name), slug = COALESCE($2, slug), type = COALESCE($3, type), updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [name, slug, type, id]
  );
  return rows[0] || null;
}

async function deleteAttribute(id) {
  const { rows: used } = await pool.query(
    `SELECT vav.variant_id FROM variant_attribute_values vav
     JOIN attribute_values av ON av.id = vav.attribute_value_id
     WHERE av.attribute_id = $1 LIMIT 1`,
    [id]
  );
  if (used.length) throw { status: 409, message: 'Cannot delete attribute used by product variants' };

  const { rows } = await pool.query(`DELETE FROM attributes WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// Attribute Values
async function addValue(attributeId, { value, slug, referenceValue, referenceMediaId }) {
  const { rows } = await pool.query(
    `INSERT INTO attribute_values (attribute_id, value, slug, reference_value, reference_media_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [attributeId, value, slug, referenceValue || null, referenceMediaId || null]
  );
  return rows[0];
}

async function updateValue(attributeId, valueId, { value, slug, referenceValue, referenceMediaId }) {
  const { rows } = await pool.query(
    `UPDATE attribute_values SET value = COALESCE($1, value), slug = COALESCE($2, slug),
     reference_value = COALESCE($3, reference_value), reference_media_id = COALESCE($4, reference_media_id), updated_at = NOW()
     WHERE id = $5 AND attribute_id = $6 RETURNING *`,
    [value, slug, referenceValue, referenceMediaId, valueId, attributeId]
  );
  return rows[0] || null;
}

async function deleteValue(attributeId, valueId) {
  const { rows: used } = await pool.query(
    `SELECT variant_id FROM variant_attribute_values WHERE attribute_value_id = $1 LIMIT 1`, [valueId]
  );
  if (used.length) throw { status: 409, message: 'Cannot delete attribute value used by product variants' };

  const { rows } = await pool.query(
    `DELETE FROM attribute_values WHERE id = $1 AND attribute_id = $2 RETURNING id`,
    [valueId, attributeId]
  );
  return rows[0] || null;
}

module.exports = { createAttribute, listAttributes, getAttribute, updateAttribute, deleteAttribute, addValue, updateValue, deleteValue };
