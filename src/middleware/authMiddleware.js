const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/appError');
const User = require('../models/User');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next(new UnauthorizedError('You are not logged in', 'NO_TOKEN'));
    }

    const match = /^Bearer\s+(.+)$/i.exec(String(authHeader).trim());
    if (!match || !match[1]) {
      return next(new UnauthorizedError('You are not logged in', 'NO_TOKEN'));
    }
    const token = match[1].trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+password +passwordResetToken +passwordResetExpires');
    if (!user) return next(new UnauthorizedError('User no longer exists', 'USER_NOT_FOUND'));
    if (!user.isActive) return next(new UnauthorizedError('User is inactive', 'USER_INACTIVE'));

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('You are not logged in', 'NO_USER'));
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action', 'ROLE_FORBIDDEN'));
    }
    return next();
  };
}

module.exports = {
  protect,
  restrictTo,
  signToken,
};

