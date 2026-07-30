const router = require('express').Router();
const ctrl = require('./permission.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { createGroupSchema, updateGroupSchema } = require('./permission.schema');

router.use(authGuard);

router.get('/', requirePermission('permission:read'), ctrl.list);
router.post('/', requirePermission('permission:create'), validate(createGroupSchema), ctrl.create);
router.get('/:id', requirePermission('permission:read'), ctrl.getOne);
router.put('/:id', requirePermission('permission:update'), validate(updateGroupSchema), ctrl.update);
router.delete('/:id', requirePermission('permission:delete'), ctrl.remove);

module.exports = router;
