const svc = require('./media.service');
const { success, paginated, error, asyncHandler } = require('../../utils/helpers');

const upload = asyncHandler(async (req, res) => {
  if (!req.files?.length) return error(res, 400, 'No files uploaded');
  const data = await svc.uploadFiles(req.files, req.user.id);
  success(res, data, 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { data, total } = await svc.listMedia({ page, limit, search: req.query.search, type: req.query.type });
  paginated(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getMedia(req.params.id);
  if (!data) return error(res, 404, 'Media not found');
  success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.updateMedia(req.params.id, req.body);
  if (!data) return error(res, 404, 'Media not found');
  success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await svc.deleteMedia(req.params.id);
  if (!data) return error(res, 404, 'Media not found');
  success(res, { message: 'Deleted successfully' });
});

module.exports = { upload, list, getOne, update, remove };
