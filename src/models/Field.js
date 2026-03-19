const mongoose = require('mongoose');

function decimalGetter(v) {
  if (v == null) return v;
  const str = typeof v === 'string' ? v : v.toString();
  const n = Number(str);
  return Number.isFinite(n) ? n : str;
}

const fieldSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    address: { type: String, required: true, trim: true, maxlength: 255 },
    city: { type: String, trim: true, maxlength: 100 },
    pricePerHour: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      min: 0,
      get: decimalGetter
    },
    currency: { type: String, default: 'EGP', maxlength: 10 },
    openTime: { type: String }, // HH:mm
    closeTime: { type: String }, // HH:mm
    isActive: { type: Boolean, default: true },
    timezone: { type: String, default: process.env.APP_TIMEZONE || 'UTC', maxlength: 64 },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    },
    amenities: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    bookingsCount: { type: Number, default: 0, min: 0 },
    ratingsCount: { type: Number, default: 0, min: 0 },
    avgRating: { type: Number, default: 0, min: 0, max: 5 }
  },
  { timestamps: true }
);

// Query optimization for list/search
fieldSchema.index({ name: 1, city: 1 });
fieldSchema.index({ ownerId: 1, isActive: 1 });

module.exports = mongoose.model('Field', fieldSchema);

