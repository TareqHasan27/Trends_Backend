const svc = require('./role.service');
const { success, paginated, error, asyncHandler } = require('../../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const data = await svc.createRole(req.body);
  success(res, data, 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { data, total } = await svc.listRoles({ page, limit, search: req.query.search });
  paginated(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getRole(req.params.id);
  if (!data) return error(res, 404, 'Role not found');
  success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.updateRole(req.params.id, req.body);
  success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await svc.deleteRole(req.params.id);
  if (!data) return error(res, 404, 'Role not found');
  success(res, { message: 'Deleted successfully' });
});

module.exports = { create, list, getOne, update, remove };
