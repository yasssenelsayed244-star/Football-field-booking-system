const express = require('express');

const BookingController = require('../controllers/bookingController');
const validate = require('../middleware/validationMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  createBookingValidator,
  cancelBookingValidator,
  updateBookingStatusValidator,
  paymentStatusValidator,
  ratingValidator
} = require('../validators/bookingValidator');

const router = express.Router();

router.use(protect);

router.post('/', validate(createBookingValidator), BookingController.create);
router.get('/me', BookingController.myBookings);
router.delete('/:id', validate(cancelBookingValidator), BookingController.cancel);
router.patch('/:id/status', restrictTo('admin'), validate(updateBookingStatusValidator), BookingController.updateStatus);
router.patch('/:id/payment-status', restrictTo('admin'), validate(paymentStatusValidator), BookingController.updatePaymentStatus);
router.post('/:id/rate', validate(ratingValidator), BookingController.rate);

module.exports = router;

