const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { error } = require('../../utils/helpers');

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'application/pdf',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('not allowed')) {
    return error(res, 422, err.message);
  }
  next(err);
};

module.exports = { upload, handleMulterError };
