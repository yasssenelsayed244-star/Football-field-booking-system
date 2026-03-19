const Booking = require('../models/Booking');
const Field = require('../models/Field');
const { BadRequestError, NotFoundError, ConflictError, ForbiddenError } = require('../utils/appError');
const AuditLogService = require('./auditLogService');

function timeToMinutes(t) {
  const [hh, mm] = String(t).split(':').map(Number);
  return hh * 60 + mm;
}

function ensureValidTimeRange(startTime, endTime) {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (Number.isNaN(s) || Number.isNaN(e)) throw new BadRequestError('Invalid time format', 'INVALID_TIME');
  if (e <= s) throw new BadRequestError('endTime must be after startTime', 'INVALID_TIME_RANGE');
  return { s, e };
}

class BookingService {
  static async create(userId, payload) {
    const field = await Field.findById(payload.fieldId);
    if (!field || !field.isActive) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND');

    const { s, e } = ensureValidTimeRange(payload.startTime, payload.endTime);

    // Check overlap: (newStart < existingEnd) && (newEnd > existingStart)
    const existing = await Booking.findOne({
      fieldId: payload.fieldId,
      date: payload.date,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existing) {
      const es = timeToMinutes(existing.startTime);
      const ee = timeToMinutes(existing.endTime);
      if (s < ee && e > es) throw new ConflictError('Time slot already booked', 'DOUBLE_BOOKING');
    }

    const hours = (e - s) / 60;
    const pricePerHour = Number(field.pricePerHour);
    const totalPrice = (hours * pricePerHour).toFixed(2);

    const booking = await Booking.create({
      userId,
      fieldId: payload.fieldId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      totalPrice,
      currency: field.currency || 'EGP',
      status: 'pending',
      paymentStatus: 'unpaid',
      notes: payload.notes || undefined,
      timezone: field.timezone || process.env.APP_TIMEZONE || 'UTC'
    });

    await Field.updateOne({ _id: payload.fieldId }, { $inc: { bookingsCount: 1 } });
    AuditLogService.create({
      actorId: userId,
      action: 'create_booking',
      entityType: 'Booking',
      entityId: booking._id,
      metadata: { fieldId: payload.fieldId, date: payload.date, startTime: payload.startTime, endTime: payload.endTime }
    }).catch(() => {});
    return booking;
  }

  static async myBookings(userId) {
    return Booking.find({ userId }).sort({ createdAt: -1 }).populate('fieldId');
  }

  static async cancelBooking(bookingId, actor, cancellationReason) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');

    const isOwner = String(booking.userId) === String(actor._id);
    const isAdmin = actor.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenError('You do not have permission to cancel this booking', 'BOOKING_CANCEL_FORBIDDEN');

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BadRequestError('Only pending/confirmed bookings can be cancelled', 'BOOKING_NOT_CANCELABLE');
    }

    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason || undefined;

    if (booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
    }

    await booking.save();
    AuditLogService.create({
      actorId: actor._id,
      action: 'cancel_booking',
      entityType: 'Booking',
      entityId: booking._id,
      metadata: { cancellationReason: booking.cancellationReason, paymentStatus: booking.paymentStatus }
    }).catch(() => {});
    return booking;
  }

  static async updateBookingStatus(bookingId, actor, status, cancellationReason) {
    if (actor.role !== 'admin') throw new ForbiddenError('You do not have permission to update booking status', 'ROLE_FORBIDDEN');

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');

    if (status === 'cancelled') {
      if (!cancellationReason) throw new BadRequestError('cancellationReason is required for cancellation', 'MISSING_CANCELLATION_REASON');
      booking.cancellationReason = cancellationReason;
    } else {
      booking.cancellationReason = undefined;
    }

    booking.status = status;
    await booking.save();
    AuditLogService.create({
      actorId: actor._id,
      action: 'update_booking_status',
      entityType: 'Booking',
      entityId: booking._id,
      metadata: { status }
    }).catch(() => {});
    return booking;
  }

  static async updatePaymentStatus(bookingId, actor, paymentStatus) {
    if (actor.role !== 'admin') throw new ForbiddenError('You do not have permission to update payment status', 'ROLE_FORBIDDEN');

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');

    booking.paymentStatus = paymentStatus;

    if (paymentStatus === 'paid' && booking.status === 'pending') {
      booking.status = 'confirmed';
    }

    if (paymentStatus === 'refunded') {
      booking.paymentStatus = 'refunded';
      if (['pending', 'confirmed'].includes(booking.status)) {
        booking.status = 'cancelled';
        booking.cancellationReason = booking.cancellationReason || 'Payment refunded';
      }
    }

    await booking.save();
    AuditLogService.create({
      actorId: actor._id,
      action: 'update_payment_status',
      entityType: 'Booking',
      entityId: booking._id,
      metadata: { paymentStatus: booking.paymentStatus, status: booking.status }
    }).catch(() => {});
    return booking;
  }

  static async rateBooking(bookingId, actor, { score, comment }) {
    const bookingQuery = actor.role === 'admin' ? { _id: bookingId } : { _id: bookingId, userId: actor._id };
    const booking = await Booking.findOne(bookingQuery);
    if (!booking) throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');

    if (booking.status !== 'completed') throw new BadRequestError('Booking must be completed to submit a rating', 'BOOKING_NOT_COMPLETED');
    if (booking.rating && booking.rating.score != null) throw new ConflictError('This booking already has a rating', 'RATING_ALREADY_EXISTS');

    booking.rating = { score, comment: comment || undefined };
    await booking.save();

    const field = await Field.findById(booking.fieldId);
    const oldCount = Number(field.ratingsCount || 0);
    const oldAvg = Number(field.avgRating || 0);
    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + score) / newCount;

    await Field.updateOne(
      { _id: field._id },
      { $set: { avgRating: Math.round(newAvg * 100) / 100 }, $inc: { ratingsCount: 1 } }
    );

    AuditLogService.create({
      actorId: actor._id,
      action: 'rate_booking',
      entityType: 'Booking',
      entityId: booking._id,
      metadata: { score }
    }).catch(() => {});

    return booking;
  }
}

module.exports = BookingService;

