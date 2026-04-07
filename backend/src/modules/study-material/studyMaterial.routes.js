const router=require('express').Router();
const ctrl=require('./studyMaterial.controller');
const {authenticate,authorise}=require('../../middleware/auth');
const {uploadMaterial}=require('../../middleware/upload');
router.use(authenticate);
router.get('/',ctrl.getAll);
router.post('/',authorise(['admin','faculty']),uploadMaterial.single('file'),ctrl.upload);
router.delete('/:id',authorise(['admin','faculty']),ctrl.remove);
module.exports=router;