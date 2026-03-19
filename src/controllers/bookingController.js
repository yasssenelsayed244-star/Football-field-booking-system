const catchAsync = require('../utils/catchAsync');
const BookingService = require('../services/bookingService');

class BookingController {
  static create = catchAsync(async (req, res) => {
    const booking = await BookingService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: booking });
  });

  static myBookings = catchAsync(async (req, res) => {
    const bookings = await BookingService.myBookings(req.user._id);
    res.status(200).json({ success: true, results: bookings.length, data: bookings });
  });

  static cancel = catchAsync(async (req, res) => {
    const { cancellationReason } = req.body;
    const booking = await BookingService.cancelBooking(req.params.id, req.user, cancellationReason);
    res.status(200).json({ success: true, data: booking });
  });

  static updateStatus = catchAsync(async (req, res) => {
    const { status, cancellationReason } = req.body;
    const booking = await BookingService.updateBookingStatus(req.params.id, req.user, status, cancellationReason);
    res.status(200).json({ success: true, data: booking });
  });

  static updatePaymentStatus = catchAsync(async (req, res) => {
    const booking = await BookingService.updatePaymentStatus(req.params.id, req.user, req.body.paymentStatus);
    res.status(200).json({ success: true, data: booking });
  });

  static rate = catchAsync(async (req, res) => {
    const booking = await BookingService.rateBooking(req.params.id, req.user, req.body);
    res.status(200).json({ success: true, data: booking });
  });
}

module.exports = BookingController;

