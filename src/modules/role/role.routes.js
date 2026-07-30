const router = require('express').Router();
const ctrl = require('./role.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { createRoleSchema, updateRoleSchema } = require('./role.schema');

router.use(authGuard);

router.get('/', requirePermission('role:read'), ctrl.list);
router.post('/', requirePermission('role:create'), validate(createRoleSchema), ctrl.create);
router.get('/:id', requirePermission('role:read'), ctrl.getOne);
router.put('/:id', requirePermission('role:update'), validate(updateRoleSchema), ctrl.update);
router.delete('/:id', requirePermission('role:delete'), ctrl.remove);

module.exports = router;
