const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 180 },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['customer', 'field_owner', 'admin'], default: 'customer' },
    phone: { type: String, maxlength: 30 },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
    favorites: { type: [mongoose.Schema.Types.ObjectId], ref: 'Field', default: [] }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtIatSeconds) {
  if (!this.passwordChangedAt) return false;
  return this.passwordChangedAt.getTime() / 1000 > jwtIatSeconds;
};

userSchema.methods.createEmailVerificationToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  const mins = Number(process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN_MIN || 60);
  this.emailVerificationExpires = new Date(Date.now() + mins * 60 * 1000);
  return verifyToken;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const mins = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MIN || 15);
  this.passwordResetExpires = new Date(Date.now() + mins * 60 * 1000);
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);

