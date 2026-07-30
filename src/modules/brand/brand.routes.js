const router = require('express').Router();
const ctrl = require('./brand.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { brandSchema, updateBrandSchema } = require('./brand.schema');

router.use(authGuard);

router.get('/', requirePermission('brand:read'), ctrl.list);
router.post('/', requirePermission('brand:create'), validate(brandSchema), ctrl.create);
router.get('/:id', requirePermission('brand:read'), ctrl.getOne);
router.put('/:id', requirePermission('brand:update'), validate(updateBrandSchema), ctrl.update);
router.delete('/:id', requirePermission('brand:delete'), ctrl.remove);

module.exports = router;
