const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

const flightSchema = new mongoose.Schema({
  flightNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  airline: { type: String, required: true, trim: true },
  origin: { type: String, required: true, trim: true },
  originCode: { type: String, required: true, uppercase: true, trim: true },
  destination: { type: String, required: true, trim: true },
  destinationCode: { type: String, required: true, uppercase: true, trim: true },
  departureDate: { type: Date, required: true },
  departureTime: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  duration: { type: String, required: true },
  aircraft: { type: String, default: 'Boeing 737' },
  totalSeats: { type: Number, required: true },
  availableSeats: { type: Number },
  priceEconomy: { type: Number, required: true },
  seats: [seatSchema],
  status: { type: String, enum: ['scheduled', 'delayed', 'cancelled', 'completed'], default: 'scheduled' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Auto-generate economy seats before save
flightSchema.pre('save', function (next) {
  if (this.isNew) {
    this.availableSeats = this.totalSeats;
    const seats = [];
    const rows = Math.ceil(this.totalSeats / 6);
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    let count = 0;
    for (let r = 1; r <= rows && count < this.totalSeats; r++) {
      for (let c = 0; c < cols.length && count < this.totalSeats; c++) {
        seats.push({ seatNumber: `${r}${cols[c]}`, isBooked: false, bookedBy: null });
        count++;
      }
    }
    this.seats = seats;
  }
  next();
});

module.exports = mongoose.model('Flight', flightSchema);
