const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const { protect } = require('../middleware/auth');
const redisClient = require('../config/redis');

const sendBookingEmail = require('../utils/sendEmail');

// Lock Seat
router.post('/lock-seat', protect, async (req, res) => {

  try {

    const { flightId, seatNumber } = req.body;

    const lockKey = `lock:${flightId}:${seatNumber}`;

    // Check if already locked
    const existingLock = await redisClient.get(lockKey);

    if (existingLock) {

      return res.status(400).json({
        message: 'Seat temporarily locked by another user'
      });

    }

    // Lock seat for 5 minutes
    await redisClient.set(
      lockKey,
      req.user._id.toString(),
      {
        EX: 300
      }
    );

    res.json({
      message: 'Seat locked successfully',
      expiresIn: 300
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// Book a flight — tourists only
router.post('/', protect, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'Admins cannot book flights. Only tourists can book.' });
  }

  const { flightId, seatNumber, passengerName, passengerEmail, passengerPhone, passengerAge } = req.body;

  try {

    const flight = await Flight.findById(flightId);

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const lockKey = `lock:${flightId}:${seatNumber}`;

    const seatLock = await redisClient.get(lockKey);

    if (!seatLock) {

      return res.status(400).json({
        message: 'Seat lock expired. Please select seat again.'
      });

    }

    if (seatLock !== req.user._id.toString()) {

      return res.status(400).json({
        message: 'Seat locked by another user.'
      });

    }

    const seat = flight.seats.find(
      s => s.seatNumber === seatNumber
    );

    if (!seat) {
      return res.status(400).json({ message: 'Seat not found' });
    }

    if (seat.isBooked) {
      return res.status(400).json({ message: 'Seat already booked' });
    }

    // Mark seat as booked
    seat.isBooked = true;
    seat.bookedBy = req.user._id;

    flight.availableSeats = Math.max(
      0,
      flight.availableSeats - 1
    );

    await flight.save();

    await redisClient.del(lockKey);

    const booking = await Booking.create({

      user: req.user._id,
      flight: flightId,

      seatNumber,

      seatClass: 'economy',

      passengerName,
      passengerEmail,
      passengerPhone,
      passengerAge,

      amountPaid: flight.priceEconomy

    });

    await booking.populate(
      'flight',
      'flightNumber airline origin destination departureDate departureTime arrivalTime originCode destinationCode'
    );

    console.log("EMAIL:", booking.passengerEmail);

    try {

      await sendBookingEmail(
        booking.passengerEmail,
        booking,
        flight
      );

      console.log("EMAIL FUNCTION EXECUTED");

    } catch (emailErr) {

      console.log("EMAIL FAILED:", emailErr);

    }

    res.status(201).json(booking);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
});

// Get my bookings
router.get('/my', protect, async (req, res) => {

  try {

    const bookings = await Booking.find({
      user: req.user._id
    })

      .populate(
        'flight',
        'flightNumber airline origin destination departureDate departureTime arrivalTime originCode destinationCode'
      )

      .sort({
        createdAt: -1
      });

    res.json(bookings);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// Cancel booking
router.put('/:id/cancel', protect, async (req, res) => {

  try {

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        message: 'Already cancelled'
      });
    }

    booking.bookingStatus = 'cancelled';

    await booking.save();

    // Free the seat
    const flight = await Flight.findById(
      booking.flight
    );

    if (flight) {

      const seat = flight.seats.find(
        s => s.seatNumber === booking.seatNumber
      );

      if (seat) {

        seat.isBooked = false;
        seat.bookedBy = null;

      }

      flight.availableSeats = Math.min(
        flight.totalSeats,
        flight.availableSeats + 1
      );

      await flight.save();

    }

    res.json({
      message: 'Booking cancelled',
      booking
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

module.exports = router;
