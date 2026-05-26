const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Dashboard stats (real data only)
router.get('/stats', async (req, res) => {
  try {
    const totalFlights = await Flight.countDocuments();
    const totalBookings = await Booking.countDocuments({ bookingStatus: 'confirmed' });
    const totalUsers = await User.countDocuments({ role: 'user' });
    const scheduledFlights = await Flight.countDocuments({ status: 'scheduled' });

    const revenueData = await Booking.aggregate([
      { $match: { bookingStatus: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    res.json({ totalFlights, totalBookings, totalUsers, scheduledFlights, totalRevenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all flights for admin
router.get('/flights', async (req, res) => {
  try {
    const flights = await Flight.find().sort({ createdAt: -1 });
    res.json(flights);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all bookings
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('flight', 'flightNumber airline origin destination departureDate')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
