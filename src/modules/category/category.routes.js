const router = require('express').Router();
const ctrl = require('./category.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { categorySchema, updateCategorySchema } = require('./category.schema');

router.use(authGuard);

router.get('/tree', requirePermission('category:read'), ctrl.tree);
router.get('/:id', requirePermission('category:read'), ctrl.getOne);
router.post('/', requirePermission('category:create'), validate(categorySchema), ctrl.create);
router.put('/:id', requirePermission('category:update'), validate(updateCategorySchema), ctrl.update);
router.delete('/:id', requirePermission('category:delete'), ctrl.remove);

module.exports = router;
