const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const pool = require('../../db/pool');
const { getPagination } = require('../../utils/helpers');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });

function getMediaType(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'document';
  return 'other';
}

async function processFile(file, userId) {
  const type = getMediaType(file.mimetype);
  let width = null, height = null, thumbnailUrl = null;

  if (type === 'image') {
    const meta = await sharp(file.path).metadata();
    width = meta.width;
    height = meta.height;

    const thumbName = `thumb_${path.basename(file.filename)}`;
    const thumbPath = path.join(THUMB_DIR, thumbName);
    await sharp(file.path).resize(200, 200, { fit: 'cover' }).toFile(thumbPath);
    thumbnailUrl = `/uploads/thumbnails/${thumbName}`;
  }

  const publicUrl = `/uploads/${file.filename}`;

  const { rows } = await pool.query(
    `INSERT INTO media (file_name, stored_path, public_url, mime_type, type, size, width, height, thumbnail_url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [file.originalname, file.path, publicUrl, file.mimetype, type, file.size, width, height, thumbnailUrl, userId]
  );
  return rows[0];
}

async function uploadFiles(files, userId) {
  return Promise.all(files.map((f) => processFile(f, userId)));
}

async function listMedia({ page, limit, search, type }) {
  const { offset } = getPagination(page, limit);
  const s = search ? `%${search}%` : null;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM media
     WHERE ($1::text IS NULL OR file_name ILIKE $1 OR title ILIKE $1)
     AND ($2::text IS NULL OR type = $2)`,
    [s, type || null]
  );

  const { rows } = await pool.query(
    `SELECT m.*, u.name AS uploaded_by_name FROM media m
     LEFT JOIN users u ON u.id = m.uploaded_by
     WHERE ($1::text IS NULL OR m.file_name ILIKE $1 OR m.title ILIKE $1)
     AND ($2::text IS NULL OR m.type = $2)
     ORDER BY m.created_at DESC
     LIMIT $3 OFFSET $4`,
    [s, type || null, limit, offset]
  );

  return { data: rows, total: parseInt(countRes.rows[0].count) };
}

async function getMedia(id) {
  const { rows } = await pool.query(`SELECT * FROM media WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateMedia(id, { altText, title }) {
  const { rows } = await pool.query(
    `UPDATE media SET alt_text = COALESCE($1, alt_text), title = COALESCE($2, title), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [altText, title, id]
  );
  return rows[0] || null;
}

async function deleteMedia(id) {
  // Check if attached to any product
  const { rows: attached } = await pool.query(
    `SELECT id FROM product_media WHERE media_id = $1 LIMIT 1`, [id]
  );
  if (attached.length) throw { status: 409, message: 'Media is attached to a product. Detach it first.' };

  const { rows } = await pool.query(`DELETE FROM media WHERE id = $1 RETURNING *`, [id]);
  if (!rows[0]) return null;

  // Remove files
  try {
    if (fs.existsSync(rows[0].stored_path)) fs.unlinkSync(rows[0].stored_path);
    if (rows[0].thumbnail_url) {
      const thumbPath = path.join(process.cwd(), rows[0].thumbnail_url);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }
  } catch {}

  return rows[0];
}

module.exports = { uploadFiles, listMedia, getMedia, updateMedia, deleteMedia };
