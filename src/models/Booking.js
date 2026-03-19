const mongoose = require('mongoose');

function decimalGetter(v) {
  if (v == null) return v;
  const str = typeof v === 'string' ? v : v.toString();
  const n = Number(str);
  return Number.isFinite(n) ? n : str;
}

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    totalPrice: { type: mongoose.Schema.Types.Decimal128, default: '0', min: 0, get: decimalGetter },
    currency: { type: String, default: 'EGP', maxlength: 10 },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    notes: { type: String, maxlength: 2000 },
    cancellationReason: { type: String, maxlength: 1000 },
    rating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 2000 }
    },
    timezone: { type: String, default: process.env.APP_TIMEZONE || 'UTC', maxlength: 64 }
  },
  { timestamps: true }
);

bookingSchema.index({ fieldId: 1, date: 1 });
bookingSchema.index({ userId: 1, date: 1 });
bookingSchema.index({ fieldId: 1, date: 1, status: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ fieldId: 1, date: 1, paymentStatus: 1 });
// Prevent double-booking the same slot while it's pending/confirmed.
bookingSchema.index(
  { fieldId: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);

module.exports = mongoose.model('Booking', bookingSchema);

