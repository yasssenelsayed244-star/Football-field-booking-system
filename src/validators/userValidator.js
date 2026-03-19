const Joi = require('joi');

const addFavoriteValidator = (data) => {
  const schema = Joi.object({
    fieldId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

module.exports = {
  addFavoriteValidator
};

