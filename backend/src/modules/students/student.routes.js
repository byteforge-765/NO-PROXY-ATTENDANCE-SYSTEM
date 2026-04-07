const router=require('express').Router();
const ctrl=require('./student.controller');
const {authenticate,authorise}=require('../../middleware/auth');
const {uploadPhoto}=require('../../middleware/upload');
router.use(authenticate);
router.get('/',authorise(['admin','faculty']),ctrl.getAll);
router.get('/:id',ctrl.getOne);
router.post('/',authorise(['admin']),uploadPhoto.single('photo'),ctrl.create);
router.put('/:id',authorise(['admin','faculty']),uploadPhoto.single('photo'),ctrl.update);
router.delete('/:id',authorise(['admin']),ctrl.remove);
router.post('/:id/enroll-face',authorise(['admin','faculty']),ctrl.enrollFace);
// 5-photo face management
router.get('/:id/face-photos',authorise(['admin','faculty']),ctrl.getFacePhotos);
router.post('/:id/face-photos',authorise(['admin','faculty']),uploadPhoto.array('photos',5),ctrl.uploadFacePhotos);
router.delete('/:id/face-photos/:photoId',authorise(['admin','faculty']),ctrl.deleteFacePhoto);
module.exports=router;
