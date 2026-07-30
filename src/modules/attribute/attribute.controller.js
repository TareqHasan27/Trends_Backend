const svc = require('./attribute.service');
const { success, paginated, error, asyncHandler } = require('../../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const data = await svc.createAttribute(req.body);
  success(res, data, 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { data, total } = await svc.listAttributes({ page, limit, search: req.query.search });
  paginated(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getAttribute(req.params.id);
  if (!data) return error(res, 404, 'Attribute not found');
  success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.updateAttribute(req.params.id, req.body);
  if (!data) return error(res, 404, 'Attribute not found');
  success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await svc.deleteAttribute(req.params.id);
  if (!data) return error(res, 404, 'Attribute not found');
  success(res, { message: 'Deleted successfully' });
});

const addValue = asyncHandler(async (req, res) => {
  const data = await svc.addValue(req.params.id, req.body);
  success(res, data, 201);
});

const updateValue = asyncHandler(async (req, res) => {
  const data = await svc.updateValue(req.params.id, req.params.valueId, req.body);
  if (!data) return error(res, 404, 'Attribute value not found');
  success(res, data);
});

const removeValue = asyncHandler(async (req, res) => {
  const data = await svc.deleteValue(req.params.id, req.params.valueId);
  if (!data) return error(res, 404, 'Attribute value not found');
  success(res, { message: 'Deleted successfully' });
});

module.exports = { create, list, getOne, update, remove, addValue, updateValue, removeValue };
