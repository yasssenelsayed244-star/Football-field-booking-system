const mongoose = require('mongoose');
const { AppError, ValidationError } = require('../utils/appError');

function normalizeJoiError(err) {
  const details = err.details?.map((d) => ({
    message: d.message,
    path: d.path,
    type: d.type,
  }));
  return new ValidationError('Invalid request data', details);
}

function normalizeMongooseError(err) {
  // Invalid ObjectId
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
  }

  // Schema validation
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors || {}).map((e) => ({
      message: e.message,
      path: [e.path],
      type: e.name,
    }));
    return new ValidationError('Invalid model data', details, 'MODEL_VALIDATION_ERROR');
  }

  // Duplicate key
  if (err && err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return new AppError(`Duplicate value for: ${fields.join(', ') || 'field'}`, 409, 'DUPLICATE_VALUE');
  }

  return null;
}

module.exports = (err, req, res, next) => {
  let error = err;

  if (error?.isJoi) error = normalizeJoiError(error);

  const mongoNormalized = normalizeMongooseError(error);
  if (mongoNormalized) error = mongoNormalized;

  if (!(error instanceof AppError)) {
    error = new AppError('Something went wrong', 500, 'INTERNAL_ERROR');
  }

  const isProd = process.env.NODE_ENV === 'production';

  res.status(error.statusCode).json({
    success: false,
    code: error.code,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(isProd ? {} : { stack: err?.stack }),
  });
};

