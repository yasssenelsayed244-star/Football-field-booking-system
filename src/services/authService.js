const crypto = require('crypto');
const User = require('../models/User');
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } = require('../utils/appError');
const { signToken } = require('../middleware/authMiddleware');
const AuditLogService = require('./auditLogService');

function sanitizeUser(userDoc) {
  const user = userDoc.toObject({ getters: true, virtuals: false });
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  return user;
}

class AuthService {
  static async register(payload) {
    const existing = await User.findOne({ email: payload.email });
    if (existing) throw new ConflictError('Email already in use', 'EMAIL_EXISTS');

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role || 'customer',
      phone: payload.phone || null,
      emailVerified: false
    });

    const emailVerificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    AuditLogService.create({
      actorId: user._id,
      action: 'register',
      entityType: 'User',
      entityId: user._id,
      metadata: { email: user.email }
    }).catch(() => {});

    const token = signToken({ id: user._id.toString() });
    const devToken = process.env.NODE_ENV !== 'production' ? emailVerificationToken : undefined;
    return { user: sanitizeUser(user), token, emailVerificationToken: devToken };
  }

  static async login(email, password) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new UnauthorizedError('Incorrect email or password', 'INVALID_CREDENTIALS');
    if (!user.isActive) throw new UnauthorizedError('User is inactive', 'USER_INACTIVE');

    const ok = await user.correctPassword(password);
    if (!ok) throw new UnauthorizedError('Incorrect email or password', 'INVALID_CREDENTIALS');

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    AuditLogService.create({
      actorId: user._id,
      action: 'login',
      entityType: 'User',
      entityId: user._id
    }).catch(() => {});

    const token = signToken({ id: user._id.toString() });
    return { user: sanitizeUser(user), token };
  }

  static async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    return sanitizeUser(user);
  }

  static async updatePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    const ok = await user.correctPassword(currentPassword);
    if (!ok) throw new UnauthorizedError('Current password is incorrect', 'WRONG_PASSWORD');

    user.password = newPassword;
    await user.save();

    AuditLogService.create({
      actorId: user._id,
      action: 'update_password',
      entityType: 'User',
      entityId: user._id
    }).catch(() => {});

    const token = signToken({ id: user._id.toString() });
    return { user: sanitizeUser(user), token };
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
    if (!user) throw new NotFoundError('There is no user with this email', 'USER_NOT_FOUND');

    const resetToken = user.createPasswordResetToken();
    await user.save();

    AuditLogService.create({
      actorId: user._id,
      action: 'forgot_password',
      entityType: 'User',
      entityId: user._id
    }).catch(() => {});

    return { message: 'Password reset token generated', resetToken };
  }

  static async resetPassword(resetToken, newPassword) {
    if (!resetToken) throw new BadRequestError('Reset token is required', 'NO_RESET_TOKEN');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) throw new BadRequestError('Token is invalid or expired', 'INVALID_OR_EXPIRED_TOKEN');

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    AuditLogService.create({
      actorId: user._id,
      action: 'reset_password',
      entityType: 'User',
      entityId: user._id
    }).catch(() => {});

    const token = signToken({ id: user._id.toString() });
    return { user: sanitizeUser(user), token };
  }

  static async sendEmailVerification(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    if (user.emailVerified) return { message: 'Email already verified' };

    const emailVerificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    AuditLogService.create({
      actorId: user._id,
      action: 'send_email_verification',
      entityType: 'User',
      entityId: user._id
    }).catch(() => {});

    const devToken = process.env.NODE_ENV !== 'production' ? emailVerificationToken : undefined;
    return { message: 'Email verification token generated', emailVerificationToken: devToken };
  }

  static async verifyEmail(emailVerificationToken) {
    if (!emailVerificationToken) throw new BadRequestError('Verification token is required', 'NO_VERIFY_TOKEN');
    const hashed = crypto.createHash('sha256').update(String(emailVerificationToken).trim()).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() },
      emailVerified: false
    });

    if (!user) throw new BadRequestError('Token is invalid or expired', 'INVALID_OR_EXPIRED_TOKEN');

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    AuditLogService.create({
      actorId: user._id,
      action: 'verify_email',
      entityType: 'User',
      entityId: user._id
    }).catch(() => {});

    return { user: sanitizeUser(user), message: 'Email verified successfully' };
  }

  static async listUsers() {
    const users = await User.find({}).sort({ createdAt: -1 });
    return users.map((u) => sanitizeUser(u));
  }

  static async updateUserRole(userId, role, actorId) {
    const valid = ['customer', 'field_owner', 'admin'];
    if (!valid.includes(role)) throw new BadRequestError('Invalid role', 'INVALID_ROLE');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    user.role = role;
    await user.save({ validateBeforeSave: false });

    AuditLogService.create({
      actorId: actorId || user._id,
      action: 'update_role',
      entityType: 'User',
      entityId: user._id,
      metadata: { role }
    }).catch(() => {});

    return sanitizeUser(user);
  }
}

module.exports = AuthService;

