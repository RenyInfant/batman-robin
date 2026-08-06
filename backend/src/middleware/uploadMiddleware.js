const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const refUploadDir = path.join(__dirname, '../../uploads/reference');
const subUploadDir = path.join(__dirname, '../../uploads/submissions');

[refUploadDir, subUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed Image Formats: PNG, JPG, JPEG, WEBP
const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type (${file.mimetype}). Allowed formats: PNG, JPG, JPEG, WEBP.`), false);
  }
}

const storageReference = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, refUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `ref_round_${Date.now()}_${Math.round(Math.random() * 1e5)}${ext}`;
    cb(null, uniqueName);
  }
});

const storageSubmission = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, subUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const teamId = req.team ? req.team.id : 'unknown';
    const uniqueName = `sub_team${teamId}_${Date.now()}_${Math.round(Math.random() * 1e5)}${ext}`;
    cb(null, uniqueName);
  }
});

function getMaxUploadSizeBytes() {
  try {
    const setting = db.prepare("SELECT value FROM competition_settings WHERE key = 'max_upload_size_mb'").get();
    const maxMb = setting ? parseFloat(setting.value) : 10;
    return maxMb * 1024 * 1024;
  } catch (err) {
    return 10 * 1024 * 1024; // Default 10MB
  }
}

const uploadReference = multer({
  storage: storageReference,
  fileFilter,
  limits: { fileSize: getMaxUploadSizeBytes() }
}).single('reference_image');

const uploadSubmission = multer({
  storage: storageSubmission,
  fileFilter,
  limits: { fileSize: getMaxUploadSizeBytes() }
}).single('submission_image');

module.exports = {
  uploadReference,
  uploadSubmission
};
