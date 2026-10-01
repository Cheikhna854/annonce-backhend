const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure UPLOADS_DIR to point at a persistent disk in production.
const uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Keep existing local images when switching to a persistent disk.
const previousUploadDir = path.join(__dirname, '..', 'uploads');
if (path.resolve(previousUploadDir) !== path.resolve(uploadDir) && fs.existsSync(previousUploadDir)) {
  for (const filename of fs.readdirSync(previousUploadDir)) {
    const previousFile = path.join(previousUploadDir, filename);
    const persistentFile = path.join(uploadDir, filename);
    if (fs.statSync(previousFile).isFile() && !fs.existsSync(persistentFile)) {
      fs.copyFileSync(previousFile, persistentFile);
    }
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Seules les images sont autorisées (jpg, jpeg, png, webp)'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = upload;


