const svc = require('./category.service');
const { success, error, asyncHandler } = require('../../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const data = await svc.createCategory(req.body);
  success(res, data, 201);
});

const tree = asyncHandler(async (req, res) => {
  const data = await svc.getTree();
  success(res, data);
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getCategory(req.params.id);
  if (!data) return error(res, 404, 'Category not found');
  success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.updateCategory(req.params.id, req.body);
  success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await svc.deleteCategory(req.params.id);
  if (!data) return error(res, 404, 'Category not found');
  success(res, { message: 'Deleted successfully' });
});

module.exports = { create, tree, getOne, update, remove };
