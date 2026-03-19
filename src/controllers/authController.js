const catchAsync = require('../utils/catchAsync');
const AuthService = require('../services/authService');

class AuthController {
  static register = catchAsync(async (req, res) => {
    const result = await AuthService.register(req.body);
    res.status(201).json({ success: true, ...result });
  });

  static login = catchAsync(async (req, res) => {
    const result = await AuthService.login(req.body.email, req.body.password);
    res.status(200).json({ success: true, ...result });
  });

  static me = catchAsync(async (req, res) => {
    const user = await AuthService.getMe(req.user._id.toString());
    res.status(200).json({ success: true, data: user });
  });

  static updatePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.updatePassword(req.user._id.toString(), currentPassword, newPassword);
    res.status(200).json({ success: true, ...result });
  });

  static forgotPassword = catchAsync(async (req, res) => {
    const result = await AuthService.forgotPassword(req.body.email);
    res.status(200).json({ success: true, ...result });
  });

  static resetPassword = catchAsync(async (req, res) => {
    const { token } = req.params;
    const result = await AuthService.resetPassword(token, req.body.password);
    res.status(200).json({ success: true, ...result });
  });

  static sendEmailVerification = catchAsync(async (req, res) => {
    const result = await AuthService.sendEmailVerification(req.user._id.toString());
    res.status(200).json({ success: true, ...result });
  });

  static verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.params;
    const result = await AuthService.verifyEmail(token);
    res.status(200).json({ success: true, ...result });
  });

  static adminListUsers = catchAsync(async (req, res) => {
    const users = await AuthService.listUsers();
    res.status(200).json({ success: true, results: users.length, data: users });
  });

  static adminUpdateRole = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await AuthService.updateUserRole(id, req.body.role, req.user._id.toString());
    res.status(200).json({ success: true, data: user });
  });
}

module.exports = AuthController;

