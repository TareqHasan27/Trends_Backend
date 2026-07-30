const pool = require('../../db/pool');

async function isAncestor(client, potentialAncestorId, categoryId) {
  if (!categoryId) return false;
  const { rows } = await client.query(`SELECT parent_id FROM categories WHERE id = $1`, [categoryId]);
  if (!rows[0]) return false;
  if (rows[0].parent_id === potentialAncestorId) return true;
  return isAncestor(client, potentialAncestorId, rows[0].parent_id);
}

async function createCategory({ name, slug, description, imageId, parentId, isActive, sortOrder }) {
  const { rows } = await pool.query(
    `INSERT INTO categories (name, slug, description, image_id, parent_id, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [name, slug, description || null, imageId || null, parentId || null, isActive, sortOrder]
  );
  return rows[0];
}

async function getTree() {
  const { rows } = await pool.query(
    `SELECT c.*, m.public_url AS image_url FROM categories c
     LEFT JOIN media m ON m.id = c.image_id
     ORDER BY c.sort_order, c.name`
  );

  const map = {};
  rows.forEach((r) => (map[r.id] = { ...r, children: [] }));
  const roots = [];
  rows.forEach((r) => {
    if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
    else roots.push(map[r.id]);
  });
  return roots;
}

async function getCategory(id) {
  const { rows } = await pool.query(
    `SELECT c.*, m.public_url AS image_url FROM categories c
     LEFT JOIN media m ON m.id = c.image_id WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateCategory(id, fields) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (fields.parentId) {
      if (fields.parentId === id) throw { status: 422, message: 'Category cannot be its own parent' };
      const cycle = await isAncestor(client, id, fields.parentId);
      if (cycle) throw { status: 422, message: 'Cycle detected: this would make the category its own ancestor' };
    }

    const { rows } = await client.query(
      `UPDATE categories SET
        name = COALESCE($1, name), slug = COALESCE($2, slug), description = COALESCE($3, description),
        image_id = COALESCE($4, image_id), parent_id = $5,
        is_active = COALESCE($6, is_active), sort_order = COALESCE($7, sort_order), updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [fields.name, fields.slug, fields.description, fields.imageId,
       fields.parentId !== undefined ? fields.parentId : null,
       fields.isActive, fields.sortOrder, id]
    );
    if (!rows[0]) throw { status: 404, message: 'Category not found' };
    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteCategory(id) {
  const { rows: children } = await pool.query(`SELECT id FROM categories WHERE parent_id = $1 LIMIT 1`, [id]);
  if (children.length) throw { status: 409, message: 'Cannot delete category with children. Reassign or delete children first.' };

  const { rows: products } = await pool.query(`SELECT product_id FROM product_categories WHERE category_id = $1 LIMIT 1`, [id]);
  if (products.length) throw { status: 409, message: 'Cannot delete category with products assigned.' };

  const { rows } = await pool.query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = { createCategory, getTree, getCategory, updateCategory, deleteCategory };
