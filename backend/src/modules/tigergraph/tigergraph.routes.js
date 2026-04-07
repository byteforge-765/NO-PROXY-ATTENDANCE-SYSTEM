const router = require('express').Router();
const { authenticate, authorise } = require('../../middleware/auth');
const ctrl   = require('./tigergraph.controller');

// Health — public (no auth needed, just status check)
router.get('/health', ctrl.health);

// Analysis routes — require authentication
router.get('/proxy-detection/:class_id',     authenticate, authorise(['admin','faculty']), ctrl.proxyDetection);
router.get('/attendance-pattern/:student_id',authenticate, ctrl.attendancePattern);
router.get('/low-attendance',                authenticate, authorise(['admin','faculty']), ctrl.lowAttendance);
router.get('/consecutive-absences/:student_id', authenticate, ctrl.consecutiveAbsences);

// Manual sync — admin only
router.post('/sync/class/:class_id',    authenticate, authorise(['admin']), ctrl.syncClass);
router.post('/sync/student/:student_id',authenticate, authorise(['admin']), ctrl.syncStudent);

module.exports = router;
