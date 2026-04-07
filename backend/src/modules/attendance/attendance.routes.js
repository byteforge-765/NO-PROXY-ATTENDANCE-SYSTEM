const router=require('express').Router();
const ctrl=require('./attendance.controller');
const {authenticate,authorise}=require('../../middleware/auth');
router.use(authenticate);
// Smart flow
router.post('/smart/verify-face',authorise(['student']),ctrl.verifyStudentFace);
router.post('/smart/verify-otp', authorise(['student']),ctrl.verifyStudentOtp);
router.post('/smart/headcount',  authorise(['faculty','admin']),ctrl.facultyHeadcount);
router.post('/smart/send-otp',   authorise(['faculty','admin']),ctrl.sendOtpToStudents);
// Manual
router.post('/manual',           authorise(['faculty','admin']),ctrl.markManual);
// Read
router.get('/class/:class_id',   authorise(['faculty','admin']),ctrl.getClassAttendance);
router.get('/student/my',        authorise(['student']),ctrl.getMyAttendance);
router.get('/session/:class_id', authorise(['faculty','admin']),ctrl.getLiveSession);
module.exports=router;