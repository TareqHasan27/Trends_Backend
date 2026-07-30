const svc = require('./permission.service');
const { success, paginated, error, asyncHandler } = require('../../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const data = await svc.createGroup(req.body.name, req.body.description, req.body.actions);
  success(res, data, 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { data, total } = await svc.listGroups({ page, limit, search: req.query.search });
  paginated(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getGroup(req.params.id);
  if (!data) return error(res, 404, 'Permission group not found');
  success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.updateGroup(req.params.id, req.body);
  success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await svc.deleteGroup(req.params.id);
  if (!data) return error(res, 404, 'Permission group not found');
  success(res, { message: 'Deleted successfully' });
});

module.exports = { create, list, getOne, update, remove };
