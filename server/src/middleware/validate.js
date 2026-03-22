const AppError = require('../utils/AppError');

/**
 * Pre-process multipart form data before Joi validation.
 * Multer delivers all fields as strings; this parses JSON strings
 * into objects/arrays so Joi can validate them properly.
 */
const preProcessBody = (data) => {
  const processed = { ...data };
  for (const key of Object.keys(processed)) {
    const val = processed[key];
    if (typeof val === 'string') {
      // Try to parse JSON strings (for arrays/objects sent via FormData)
      if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
        try { processed[key] = JSON.parse(val); } catch {}
      }
    }
  }
  return processed;
};

const validate = (schema, source = 'body') => (req, res, next) => {
  let data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

  // When the request is multipart (files present), pre-process body fields
  if (source === 'body' && (req.file || req.files)) {
    data = preProcessBody(data);
  }

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    convert: true, // allow Joi to coerce strings → numbers, etc.
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return res.status(400).json({
      status: 'fail',
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    });
  }

  req[source] = value;
  next();
};

module.exports = validate;
