const pool = require('../../db/pool');
const { getPagination } = require('../../utils/helpers');

function deriveStockStatus(stock) {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 5) return 'low_stock';
  return 'in_stock';
}

async function insertVariants(client, productId, variants) {
  for (const v of variants) {
    const stockStatus = deriveStockStatus(v.stock);
    const { rows } = await client.query(
      `INSERT INTO product_variants (product_id, sku, price, sale_price, stock, stock_status, low_stock_threshold, weight, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [productId, v.sku, v.price, v.salePrice ?? null, v.stock, stockStatus, v.lowStockThreshold ?? 5, v.weight ?? null, v.isActive ?? true]
    );
    const variantId = rows[0].id;

    for (const avId of v.attributeValueIds) {
      const { rows: avCheck } = await client.query(`SELECT id FROM attribute_values WHERE id = $1`, [avId]);
      if (!avCheck.length) throw { status: 422, message: `Attribute value ${avId} does not exist` };
      await client.query(
        `INSERT INTO variant_attribute_values (variant_id, attribute_value_id) VALUES ($1, $2)`,
        [variantId, avId]
      );
    }
  }
}

async function insertMedia(client, productId, mediaList) {
  for (const m of mediaList) {
    await client.query(
      `INSERT INTO product_media (product_id, media_id, variant_id, attribute_value_id, is_thumbnail, is_gallery, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [productId, m.mediaId, m.variantId || null, m.attributeValueId || null, m.isThumbnail ?? false, m.isGallery ?? false, m.sortOrder || 0]
    );
  }
}

function validateProductRules(data) {
  if (!data.hasVariants) {
    if (data.price == null) throw { status: 422, message: 'Price is required for simple products' };
    if (data.variants?.length) throw { status: 422, message: 'Simple products cannot have variants' };
  } else {
    if (data.price != null) throw { status: 422, message: 'Variable products must not have a top-level price' };
  }
  if (data.salePrice != null && data.price != null && data.salePrice >= data.price) {
    throw { status: 422, message: 'Sale price must be less than price' };
  }
  const thumbs = (data.media || []).filter((m) => m.isThumbnail && !m.variantId);
  if (thumbs.length > 1) throw { status: 422, message: 'Only one thumbnail allowed per product' };
}

async function createProduct(data) {
  validateProductRules(data);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stockStatus = !data.hasVariants ? deriveStockStatus(data.stock ?? 0) : null;
    const { rows } = await client.query(
      `INSERT INTO products (name, slug, sku, short_description, long_description, has_variants,
        price, sale_price, stock, stock_status, weight, is_active, is_featured, sort_order, brand_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [data.name, data.slug, data.sku || null, data.shortDescription || null, data.longDescription || null,
       data.hasVariants, data.price ?? null, data.salePrice ?? null, data.stock ?? null, stockStatus,
       data.weight ?? null, data.isActive ?? true, data.isFeatured ?? false, data.sortOrder ?? 0, data.brandId || null]
    );
    const product = rows[0];

    for (const catId of (data.categoryIds || [])) {
      await client.query(`INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`, [product.id, catId]);
    }

    if (data.hasVariants && data.variants?.length) {
      await insertVariants(client, product.id, data.variants);
    }

    if (data.media?.length) {
      await insertMedia(client, product.id, data.media);
    }

    await client.query('COMMIT');
    return getProduct(product.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listProducts({ page, limit, search, categoryId, brandId, isActive }) {
  const { offset } = getPagination(page, limit);
  const s = search ? `%${search}%` : null;

  const countRes = await pool.query(
    `SELECT COUNT(DISTINCT p.id) FROM products p
     LEFT JOIN product_categories pc ON pc.product_id = p.id
     WHERE ($1::text IS NULL OR p.name ILIKE $1 OR p.sku ILIKE $1)
     AND ($2::uuid IS NULL OR pc.category_id = $2)
     AND ($3::uuid IS NULL OR p.brand_id = $3)
     AND ($4::boolean IS NULL OR p.is_active = $4)`,
    [s, categoryId || null, brandId || null, isActive ?? null]
  );

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.slug, p.sku, p.has_variants, p.price, p.sale_price,
            p.stock, p.stock_status, p.is_active, p.is_featured, p.created_at,
            b.name AS brand_name,
            (SELECT m.public_url FROM product_media pmr JOIN media m ON m.id = pmr.media_id
             WHERE pmr.product_id = p.id AND pmr.is_thumbnail = true AND pmr.variant_id IS NULL LIMIT 1) AS thumbnail,
            (SELECT json_agg(c.name) FROM product_categories pc2 JOIN categories c ON c.id = pc2.category_id WHERE pc2.product_id = p.id) AS categories
     FROM products p
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN product_categories pc ON pc.product_id = p.id
     WHERE ($1::text IS NULL OR p.name ILIKE $1 OR p.sku ILIKE $1)
     AND ($2::uuid IS NULL OR pc.category_id = $2)
     AND ($3::uuid IS NULL OR p.brand_id = $3)
     AND ($4::boolean IS NULL OR p.is_active = $4)
     GROUP BY p.id, b.name
     ORDER BY p.created_at DESC
     LIMIT $5 OFFSET $6`,
    [s, categoryId || null, brandId || null, isActive ?? null, limit, offset]
  );

  return { data: rows, total: parseInt(countRes.rows[0].count) };
}

async function getProduct(id) {
  const { rows } = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  const product = rows[0];

  const { rows: categories } = await pool.query(
    `SELECT c.id, c.name, c.slug FROM categories c JOIN product_categories pc ON pc.category_id = c.id WHERE pc.product_id = $1`, [id]
  );

  const { rows: brandRows } = await pool.query(`SELECT id, name, slug FROM brands WHERE id = $1`, [product.brand_id]);

  const { rows: media } = await pool.query(
    `SELECT pm.*, m.public_url, m.thumbnail_url, m.file_name, m.mime_type, m.type
     FROM product_media pm JOIN media m ON m.id = pm.media_id
     WHERE pm.product_id = $1 ORDER BY pm.sort_order`,
    [id]
  );

  const { rows: variants } = await pool.query(
    `SELECT pv.*,
      json_agg(json_build_object('id', av.id, 'value', av.value, 'slug', av.slug, 'attributeId', av.attribute_id)) FILTER (WHERE av.id IS NOT NULL) AS attribute_values
     FROM product_variants pv
     LEFT JOIN variant_attribute_values vav ON vav.variant_id = pv.id
     LEFT JOIN attribute_values av ON av.id = vav.attribute_value_id
     WHERE pv.product_id = $1
     GROUP BY pv.id ORDER BY pv.created_at`,
    [id]
  );

  return { ...product, categories, brand: brandRows[0] || null, media, variants };
}

async function updateProduct(id, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (!existing.rows[0]) throw { status: 404, message: 'Product not found' };

    const stockStatus = data.stock != null ? deriveStockStatus(data.stock) : undefined;

    await client.query(
      `UPDATE products SET
        name = COALESCE($1, name), slug = COALESCE($2, slug), sku = COALESCE($3, sku),
        short_description = COALESCE($4, short_description), long_description = COALESCE($5, long_description),
        price = COALESCE($6, price), sale_price = COALESCE($7, sale_price),
        stock = COALESCE($8, stock), stock_status = COALESCE($9::varchar, stock_status),
        weight = COALESCE($10, weight), is_active = COALESCE($11, is_active),
        is_featured = COALESCE($12, is_featured), sort_order = COALESCE($13, sort_order),
        brand_id = COALESCE($14, brand_id), updated_at = NOW()
       WHERE id = $15`,
      [data.name, data.slug, data.sku, data.shortDescription, data.longDescription,
       data.price, data.salePrice, data.stock, stockStatus ?? null,
       data.weight, data.isActive, data.isFeatured, data.sortOrder, data.brandId, id]
    );

    if (data.categoryIds !== undefined) {
      await client.query(`DELETE FROM product_categories WHERE product_id = $1`, [id]);
      for (const catId of data.categoryIds) {
        await client.query(`INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`, [id, catId]);
      }
    }

    if (data.media !== undefined) {
      await client.query(`DELETE FROM product_media WHERE product_id = $1`, [id]);
      if (data.media.length) await insertMedia(client, id, data.media);
    }

    if (data.variants !== undefined) {
      await client.query(`DELETE FROM product_variants WHERE product_id = $1`, [id]);
      if (data.variants.length) await insertVariants(client, id, data.variants);
    }

    await client.query('COMMIT');
    return getProduct(id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteProduct(id) {
  const { rows } = await pool.query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = { createProduct, listProducts, getProduct, updateProduct, deleteProduct };
