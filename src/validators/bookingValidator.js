const Joi = require('joi');

const createBookingValidator = (data) => {
  const schema = Joi.object({
    fieldId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(), // HH:mm
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(), // HH:mm
    notes: Joi.string().trim().max(2000).optional()
  });

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const cancelBookingValidator = (data) => {
  const schema = Joi.object({
    cancellationReason: Joi.string().trim().min(3).max(1000).required()
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const updateBookingStatusValidator = (data) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').required(),
    cancellationReason: Joi.string().trim().max(1000).optional()
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const paymentStatusValidator = (data) => {
  const schema = Joi.object({
    paymentStatus: Joi.string().valid('unpaid', 'paid', 'refunded').required()
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const ratingValidator = (data) => {
  const schema = Joi.object({
    score: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(2000).optional()
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

module.exports = {
  createBookingValidator,
  cancelBookingValidator,
  updateBookingStatusValidator,
  paymentStatusValidator,
  ratingValidator
};

