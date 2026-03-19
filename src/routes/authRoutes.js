const express = require('express');

const AuthController = require('../controllers/authController');
const validate = require('../middleware/validationMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  registerValidator,
  loginValidator,
  updatePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updateRoleValidator
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', validate(registerValidator), AuthController.register);
router.post('/login', validate(loginValidator), AuthController.login);
router.post('/forgot-password', validate(forgotPasswordValidator), AuthController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordValidator), AuthController.resetPassword);

router.get('/me', protect, AuthController.me);
router.patch('/update-password', protect, validate(updatePasswordValidator), AuthController.updatePassword);

router.post('/send-email-verification', protect, AuthController.sendEmailVerification);
router.get('/verify-email/:token', AuthController.verifyEmail);

router.get('/admin/users', protect, restrictTo('admin'), AuthController.adminListUsers);
router.patch('/admin/users/:id/role', protect, restrictTo('admin'), validate(updateRoleValidator), AuthController.adminUpdateRole);

module.exports = router;

