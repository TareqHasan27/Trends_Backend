const router = require('express').Router();
const ctrl = require('./product.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { createProductSchema, updateProductSchema } = require('./product.schema');

router.use(authGuard);

router.get('/', requirePermission('product:read'), ctrl.list);
router.post('/', requirePermission('product:create'), validate(createProductSchema), ctrl.create);
router.get('/:id', requirePermission('product:read'), ctrl.getOne);
router.put('/:id', requirePermission('product:update'), validate(updateProductSchema), ctrl.update);
router.delete('/:id', requirePermission('product:delete'), ctrl.remove);

module.exports = router;
