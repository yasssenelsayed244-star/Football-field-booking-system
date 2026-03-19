const Joi = require('joi');

const registerValidator = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    email: Joi.string().trim().lowercase().email().max(180).required(),
    password: Joi.string().min(6).max(128).required(),
    passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'passwordConfirm must match password'
    }),
    role: Joi.string().valid('customer', 'field_owner', 'admin').default('customer'),
    phone: Joi.string().trim().max(30).optional()
  });

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const loginValidator = (data) => {
  const schema = Joi.object({
    email: Joi.string().trim().lowercase().email().max(180).required(),
    password: Joi.string().min(6).max(128).required()
  });

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const updatePasswordValidator = (data) => {
  const schema = Joi.object({
    currentPassword: Joi.string().min(6).max(128).required(),
    newPassword: Joi.string().min(6).max(128).required(),
    newPasswordConfirm: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'newPasswordConfirm must match newPassword'
    })
  });

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const forgotPasswordValidator = (data) => {
  const schema = Joi.object({
    email: Joi.string().trim().lowercase().email().max(180).required()
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const resetPasswordValidator = (data) => {
  const schema = Joi.object({
    password: Joi.string().min(6).max(128).required(),
    passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'passwordConfirm must match password'
    })
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

const updateRoleValidator = (data) => {
  const schema = Joi.object({
    role: Joi.string().valid('customer', 'field_owner', 'admin').required()
  });
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

module.exports = {
  registerValidator,
  loginValidator,
  updatePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updateRoleValidator
};

