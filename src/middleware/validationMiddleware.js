const { ValidationError } = require('../utils/appError');

module.exports = (validatorFn) => (req, res, next) => {
  const { error, value } = validatorFn(req.body);
  if (error) {
    const details = error.details?.map((d) => ({
      message: d.message,
      path: d.path,
      type: d.type,
    }));
    return next(new ValidationError('Invalid request data', details));
  }

  req.body = value;
  return next();
};

