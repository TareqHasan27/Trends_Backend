const svc = require('./product.service');
const { success, paginated, error, asyncHandler } = require('../../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const data = await svc.createProduct(req.body);
  success(res, data, 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
  const { data, total } = await svc.listProducts({
    page, limit,
    search: req.query.search,
    categoryId: req.query.categoryId,
    brandId: req.query.brandId,
    isActive,
  });
  paginated(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getProduct(req.params.id);
  if (!data) return error(res, 404, 'Product not found');
  success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.updateProduct(req.params.id, req.body);
  success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await svc.deleteProduct(req.params.id);
  if (!data) return error(res, 404, 'Product not found');
  success(res, { message: 'Deleted successfully' });
});

module.exports = { create, list, getOne, update, remove };
