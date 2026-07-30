const router = require('express').Router();
const ctrl = require('./attribute.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { attributeSchema, updateAttributeSchema, attributeValueSchema, updateAttributeValueSchema } = require('./attribute.schema');

router.use(authGuard);

router.get('/', requirePermission('attribute:read'), ctrl.list);
router.post('/', requirePermission('attribute:create'), validate(attributeSchema), ctrl.create);
router.get('/:id', requirePermission('attribute:read'), ctrl.getOne);
router.put('/:id', requirePermission('attribute:update'), validate(updateAttributeSchema), ctrl.update);
router.delete('/:id', requirePermission('attribute:delete'), ctrl.remove);

// Attribute values (nested routes — all guarded)
router.post('/:id/values', requirePermission('attribute:update'), validate(attributeValueSchema), ctrl.addValue);
router.put('/:id/values/:valueId', requirePermission('attribute:update'), validate(updateAttributeValueSchema), ctrl.updateValue);
router.delete('/:id/values/:valueId', requirePermission('attribute:update'), ctrl.removeValue);

module.exports = router;
