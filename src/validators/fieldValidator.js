const Joi = require('joi');

function amenitiesJsonValidator(value, helpers) {
  // Accept either `["WiFi","Parking"]` or `'["WiFi","Parking"]'`
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return helpers.error('any.invalid');
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return helpers.error('any.invalid');
    const normalized = parsed.map((a) => (typeof a === 'string' ? a.trim() : null));
    if (normalized.some((a) => !a)) return helpers.error('any.invalid');
    if (normalized.some((a) => a.length > 60)) return helpers.error('any.invalid');
    return normalized;
  } catch {
    return helpers.error('any.invalid');
  }
}

const createFieldValidator = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(150).required(),
    description: Joi.string().trim().max(2000).optional(),
    address: Joi.string().trim().min(3).max(255).required(),
    city: Joi.string().trim().max(100).optional(),
    pricePerHour: Joi.number().precision(2).min(0).required(),
    currency: Joi.string().max(10).default('EGP'),
    openTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    closeTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).optional(),
      lng: Joi.number().min(-180).max(180).optional()
    }).optional(),
    amenities: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().max(60)).default([]),
      Joi.string().custom(amenitiesJsonValidator)
    ).default([]),
    timezone: Joi.string().max(64).optional(),
    photos: Joi.array().items(Joi.string().uri()).default([])
  });

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const updateFieldValidator = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(150).optional(),
    description: Joi.string().trim().max(2000).optional(),
    address: Joi.string().trim().min(3).max(255).optional(),
    city: Joi.string().trim().max(100).optional(),
    pricePerHour: Joi.number().precision(2).min(0).optional(),
    currency: Joi.string().max(10).optional(),
    openTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    closeTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    isActive: Joi.boolean().optional(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).optional(),
      lng: Joi.number().min(-180).max(180).optional()
    }).optional(),
    amenities: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().max(60)),
      Joi.string().custom(amenitiesJsonValidator)
    ).optional(),
    timezone: Joi.string().max(64).optional(),
    photos: Joi.array().items(Joi.string().uri()).optional(),
    bookingsCount: Joi.number().min(0).optional(),
    ratingsCount: Joi.number().min(0).optional(),
    avgRating: Joi.number().min(0).max(5).optional()
  }).min(1);

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

module.exports = {
  createFieldValidator,
  updateFieldValidator
};

