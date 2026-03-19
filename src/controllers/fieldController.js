const catchAsync = require('../utils/catchAsync');
const FieldService = require('../services/fieldService');
const { BadRequestError } = require('../utils/appError');

class FieldController {
  static create = catchAsync(async (req, res) => {
    const field = await FieldService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: field });
  });

  static list = catchAsync(async (req, res) => {
    const fields = await FieldService.list(req.query);
    res.status(200).json({ success: true, results: fields.length, data: fields });
  });

  static get = catchAsync(async (req, res) => {
    const field = await FieldService.getById(req.params.id);
    res.status(200).json({ success: true, data: field });
  });

  static update = catchAsync(async (req, res) => {
    const field = await FieldService.update(req.params.id, req.user, req.body);
    res.status(200).json({ success: true, data: field });
  });

  static remove = catchAsync(async (req, res) => {
    await FieldService.remove(req.params.id, req.user);
    res.status(204).send();
  });

  static availability = catchAsync(async (req, res) => {
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      throw new BadRequestError('Invalid date format. Expected YYYY-MM-DD', 'INVALID_DATE');
    }

    const availability = await FieldService.getAvailabilityByDay(req.params.id, String(date));
    res.status(200).json({ success: true, data: availability });
  });
}

module.exports = FieldController;

