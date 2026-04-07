const router = require('express').Router();
const { login, me, changePassword } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
