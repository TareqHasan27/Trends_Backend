const router = require('express').Router();
const ctrl = require('./media.controller');
const { authGuard, requirePermission } = require('../../middlewares/auth');
const { upload, handleMulterError } = require('./media.upload');

router.use(authGuard);

router.post('/upload', requirePermission('media:upload'), upload.array('files', 10), handleMulterError, ctrl.upload);
router.get('/', requirePermission('media:read'), ctrl.list);
router.get('/:id', requirePermission('media:read'), ctrl.getOne);
router.put('/:id', requirePermission('media:write'), ctrl.update);
router.delete('/:id', requirePermission('media:delete'), ctrl.remove);

module.exports = router;
