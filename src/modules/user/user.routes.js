const router = require('express').Router();
const ctrl = require('./user.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { createUserSchema, updateUserSchema } = require('./user.schema');

router.use(authGuard);

router.get('/', requirePermission('user:read'), ctrl.list);
router.post('/', requirePermission('user:create'), validate(createUserSchema), ctrl.create);
router.get('/:id', requirePermission('user:read'), ctrl.getOne);
router.put('/:id', requirePermission('user:update'), validate(updateUserSchema), ctrl.update);
router.delete('/:id', requirePermission('user:delete'), ctrl.remove);

module.exports = router;
