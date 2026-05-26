const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  seatNumber: { type: String, required: true },
  seatClass: { type: String, enum: ['economy', 'business', 'first'], default: 'economy' },
  passengerName: { type: String, required: true },
  passengerEmail: { type: String, required: true },
  passengerPhone: { type: String, required: true },
  passengerAge: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  bookingStatus: { type: String, enum: ['confirmed', 'cancelled', 'pending'], default: 'confirmed' },
  bookingReference: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// Auto-generate booking reference
bookingSchema.pre('save', function (next) {
  if (!this.bookingReference) {
    this.bookingReference = 'BMF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
