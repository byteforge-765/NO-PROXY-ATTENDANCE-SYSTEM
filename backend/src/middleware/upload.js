const multer = require('multer');
const path = require('path');
const fs = require('fs');

const makeStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
    ? cb(null, true) : cb(new Error('Only images allowed'));
};

const pdfFilter = (req, file, cb) => {
  /pdf|jpeg|jpg|png/.test(file.mimetype) ? cb(null, true) : cb(new Error('PDF or image only'));
};

const uploadPhoto    = multer({ storage: makeStorage('photos'),         fileFilter: imageFilter, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 } });
const uploadMaterial = multer({ storage: makeStorage('study-material'), fileFilter: pdfFilter,  limits: { fileSize: 20 * 1024 * 1024 } });

module.exports = { uploadPhoto, uploadMaterial };
