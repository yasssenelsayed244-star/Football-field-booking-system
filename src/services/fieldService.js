const Field = require('../models/Field');
const Booking = require('../models/Booking');
const { NotFoundError, ForbiddenError } = require('../utils/appError');
const AuditLogService = require('./auditLogService');

class FieldService {
  static async create(ownerId, payload) {
    const field = await Field.create({ ownerId, ...payload });
    AuditLogService.create({
      actorId: ownerId,
      action: 'create_field',
      entityType: 'Field',
      entityId: field._id,
      metadata: { name: field.name }
    }).catch(() => {});
    return field;
  }

  static async list(query = {}) {
    const filter = { isActive: true };
    if (query.ownerId) filter.ownerId = query.ownerId;
    if (query.city) filter.city = String(query.city).trim();
    if (query.q) filter.name = { $regex: String(query.q).trim(), $options: 'i' };

    return Field.find(filter).sort({ createdAt: -1 });
  }

  static async getById(id) {
    const field = await Field.findById(id);
    if (!field) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND');
    return field;
  }

  static async update(fieldId, user, payload) {
    const field = await Field.findById(fieldId);
    if (!field) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND');

    const isOwner = String(field.ownerId) === String(user._id);
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenError('Not allowed to update this field', 'FIELD_UPDATE_FORBIDDEN');

    Object.assign(field, payload);
    await field.save();

    AuditLogService.create({
      actorId: user._id,
      action: 'update_field',
      entityType: 'Field',
      entityId: field._id,
      metadata: { changedKeys: Object.keys(payload) }
    }).catch(() => {});

    return field;
  }

  static async remove(fieldId, user) {
    const field = await Field.findById(fieldId);
    if (!field) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND');

    const isOwner = String(field.ownerId) === String(user._id);
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenError('Not allowed to delete this field', 'FIELD_DELETE_FORBIDDEN');

    await field.deleteOne();
    AuditLogService.create({
      actorId: user._id,
      action: 'delete_field',
      entityType: 'Field',
      entityId: field._id
    }).catch(() => {});
  }

  static timeToMinutes(t) {
    const [hh, mm] = String(t).split(':').map(Number);
    return hh * 60 + mm;
  }

  static async getAvailabilityByDay(fieldId, date) {
    const field = await Field.findById(fieldId);
    if (!field) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND');
    if (!field.isActive) throw new NotFoundError('Field not available', 'FIELD_INACTIVE');

    if (!field.openTime || !field.closeTime) {
      return {
        date,
        timezone: field.timezone || process.env.APP_TIMEZONE || 'UTC',
        slots: []
      };
    }

    const openMinutes = this.timeToMinutes(field.openTime);
    const closeMinutes = this.timeToMinutes(field.closeTime);
    if (Number.isNaN(openMinutes) || Number.isNaN(closeMinutes) || closeMinutes <= openMinutes) {
      return {
        date,
        timezone: field.timezone || process.env.APP_TIMEZONE || 'UTC',
        slots: []
      };
    }

    // Hourly slots. For variable-duration bookings we still check overlap precisely.
    const slotMinutes = 60;
    const activeBookings = await Booking.find({
      fieldId,
      date,
      status: { $in: ['pending', 'confirmed'] }
    }).select({ startTime: 1, endTime: 1 });

    const bookingsWithMinutes = activeBookings.map((b) => ({
      s: this.timeToMinutes(b.startTime),
      e: this.timeToMinutes(b.endTime)
    }));

    const slots = [];
    for (let m = openMinutes; m + slotMinutes <= closeMinutes; m += slotMinutes) {
      const slotStart = m;
      const slotEnd = m + slotMinutes;

      const isOccupied = bookingsWithMinutes.some(({ s, e }) => slotStart < e && slotEnd > s);

      const toHHmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      slots.push({
        startTime: toHHmm(slotStart),
        endTime: toHHmm(slotEnd),
        available: !isOccupied
      });
    }

    return {
      date,
      timezone: field.timezone || process.env.APP_TIMEZONE || 'UTC',
      slots
    };
  }
}

module.exports = FieldService;

