const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

const imageUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilter(['.jpg', '.jpeg', '.png', '.webp']),
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: fileFilter(['.mp4', '.mov', '.avi', '.webm']),
});

const csvUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(['.csv']),
});

const anyUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

module.exports = { imageUpload, videoUpload, csvUpload, anyUpload };
