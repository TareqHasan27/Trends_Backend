const svc = require('./brand.service');
const { success, paginated, error, asyncHandler } = require('../../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const data = await svc.createBrand(req.body);
  success(res, data, 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { data, total } = await svc.listBrands({ page, limit, search: req.query.search, status: req.query.status });
  paginated(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getBrand(req.params.id);
  if (!data) return error(res, 404, 'Brand not found');
  success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.updateBrand(req.params.id, req.body);
  if (!data) return error(res, 404, 'Brand not found');
  success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await svc.deleteBrand(req.params.id);
  if (!data) return error(res, 404, 'Brand not found');
  success(res, { message: 'Deleted successfully' });
});

module.exports = { create, list, getOne, update, remove };
