const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');
const Field = require('../models/Field');
const { BadRequestError, NotFoundError } = require('../utils/appError');
const AuditLogService = require('../services/auditLogService');

class UserController {
  static listFavorites = catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).populate('favorites');
    return res.status(200).json({ success: true, data: user.favorites });
  });

  static addFavorite = catchAsync(async (req, res) => {
    const { fieldId } = req.body;
    const field = await Field.findById(fieldId);
    if (!field || !field.isActive) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND');

    await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: fieldId } });
    AuditLogService.create({
      actorId: req.user._id,
      action: 'add_favorite',
      entityType: 'Field',
      entityId: fieldId
    }).catch(() => {});
    const user = await User.findById(req.user._id).populate('favorites');
    return res.status(201).json({ success: true, data: user.favorites });
  });

  static removeFavorite = catchAsync(async (req, res) => {
    const { fieldId } = req.params;
    if (!fieldId || !/^[0-9a-fA-F]{24}$/.test(String(fieldId))) {
      throw new BadRequestError('Invalid fieldId', 'INVALID_FIELD_ID');
    }

    await User.updateOne({ _id: req.user._id }, { $pull: { favorites: fieldId } });
    AuditLogService.create({
      actorId: req.user._id,
      action: 'remove_favorite',
      entityType: 'Field',
      entityId: fieldId
    }).catch(() => {});
    const user = await User.findById(req.user._id).populate('favorites');
    return res.status(200).json({ success: true, data: user.favorites });
  });
}

module.exports = UserController;

