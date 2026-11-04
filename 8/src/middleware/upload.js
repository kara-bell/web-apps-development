const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadsDir);
  },
  filename(req, file, callback) {
    const userId = req.user ? req.user._id.toString() : 'user';
    const extension = MIME_EXTENSIONS[file.mimetype];
    const suffix = crypto.randomBytes(4).toString('hex');

    callback(null, `${userId}-${Date.now()}-${suffix}${extension}`);
  },
});

function fileFilter(req, file, callback) {
  if (!MIME_EXTENSIONS[file.mimetype]) {
    const error = new Error('Поддерживаются только JPEG, PNG и WebP');
    error.status = 415;
    return callback(error);
  }

  return callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

async function removeFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function removeAvatarFile(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/')) {
    return;
  }

  const filename = path.basename(avatarUrl);
  await removeFile(path.join(uploadsDir, filename));
}

module.exports = {
  upload,
  uploadsDir,
  removeFile,
  removeAvatarFile,
  MAX_FILE_SIZE,
};
