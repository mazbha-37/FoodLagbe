const multer = require('multer');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed.', 400, 'INVALID_FILE_TYPE'), false);
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadSingle = (fieldName) => multerInstance.single(fieldName);
const uploadMultiple = (fieldName, maxCount) => multerInstance.array(fieldName, maxCount);
const uploadFields = (fields) => multerInstance.fields(fields);

module.exports = { uploadSingle, uploadMultiple, uploadFields };
