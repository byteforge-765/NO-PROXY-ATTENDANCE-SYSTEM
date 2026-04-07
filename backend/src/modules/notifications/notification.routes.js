const router=require('express').Router();
const ctrl=require('./notification.controller');
const {authenticate,authorise}=require('../../middleware/auth');
router.use(authenticate);
router.post('/send',authorise(['admin','faculty']),ctrl.send);
router.get('/my',authorise(['student']),ctrl.getMyNotifications);
router.put('/:id/read',authorise(['student']),ctrl.markRead);
module.exports=router;