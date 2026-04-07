const router=require('express').Router();
const ctrl=require('./dashboard.controller');
const {authenticate,authorise}=require('../../middleware/auth');
router.use(authenticate);
router.get('/admin',authorise(['admin']),ctrl.adminDashboard);
router.get('/student',authorise(['student']),ctrl.studentDashboard);
module.exports=router;