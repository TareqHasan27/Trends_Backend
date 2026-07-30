const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authGuard } = require('../../middlewares/auth');
const { validate } = require('../../utils/helpers');
const { loginSchema } = require('./auth.schema');

router.post('/login', validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authGuard, ctrl.logout);
router.get('/session', authGuard, ctrl.session);

module.exports = router;
