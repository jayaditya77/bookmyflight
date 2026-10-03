const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const { protect } = require('../middleware/auth');
const redisClient = require('../config/redis');

const bookingQueue = require('../queues/bookingQueue');
const LOCK_TTL_SECONDS = 300;
const lockExpiryTimers = new Map();

const clearLockExpiryTimer = (lockKey) => {
  const timer = lockExpiryTimers.get(lockKey);
  if (timer) clearTimeout(timer);
  lockExpiryTimers.delete(lockKey);
};

const scheduleLockExpiryBroadcast = (io, flightId, seatNumber, ownerId, expiresAt) => {
  const lockKey = `lock:${flightId}:${seatNumber}`;
  clearLockExpiryTimer(lockKey);

  const timer = setTimeout(async () => {
    lockExpiryTimers.delete(lockKey);
    try {
      const currentOwner = await redisClient.get(lockKey);
      if (currentOwner && currentOwner !== ownerId) return;

      const stillExpired = await redisClient.eval(
        "if redis.call('exists', KEYS[1]) == 0 then return 1 else return 0 end",
        { keys: [lockKey], arguments: [] }
      );
      if (stillExpired === 1) {
        io.to(`flight:${flightId}`).emit('seatUnlocked', { flightId, seatNumber });
        return;
      }

      const ttl = await redisClient.ttl(lockKey);
      if (ttl > 0 && currentOwner === ownerId) {
        scheduleLockExpiryBroadcast(io, flightId, seatNumber, ownerId, Date.now() + ttl * 1000);
      }
    } catch (err) {
      console.error('Seat lock expiry check failed:', err.message);
    }
  }, Math.max(0, expiresAt - Date.now()));

  timer.unref?.();
  lockExpiryTimers.set(lockKey, timer);
};

// Lock Seat
router.post('/lock-seat', protect, async (req, res) => {

  try {

    const { flightId, seatNumber } = req.body;
    if (!flightId || !seatNumber) {
      return res.status(400).json({ message: 'Flight and seat are required.' });
    }

    const flight = await Flight.findById(flightId).select('seats');
    if (!flight) return res.status(404).json({ message: 'Flight not found.' });
    const seat = flight.seats.find((item) => item.seatNumber === seatNumber);
    if (!seat || seat.isBooked) {
      return res.status(400).json({ message: 'Seat is not available.' });
    }

    const lockKey = `lock:${flightId}:${seatNumber}`;
    const ownerId = req.user._id.toString();
    const acquired = await redisClient.eval(
      "local owner = redis.call('get', KEYS[1]); if not owner or owner == ARGV[1] then redis.call('set', KEYS[1], ARGV[1], 'EX', ARGV[2]); return 1 else return 0 end",
      { keys: [lockKey], arguments: [ownerId, String(LOCK_TTL_SECONDS)] }
    );
    if (acquired !== 1) {
      return res.status(409).json({ message: 'Seat temporarily locked by another user.' });
    }

    const expiresAt = Date.now() + LOCK_TTL_SECONDS * 1000;
    const io = req.app.get('io');
    scheduleLockExpiryBroadcast(io, flightId, seatNumber, ownerId, expiresAt);
    io.to(`flight:${flightId}`).emit('seatLocked', { flightId, seatNumber, expiresAt });

    res.json({
      message: 'Seat locked successfully',
      expiresIn: LOCK_TTL_SECONDS,
      expiresAt
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

router.get('/seat-locks/:flightId', protect, async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.flightId).select('seats');
    if (!flight) return res.status(404).json({ message: 'Flight not found.' });

    const locks = await Promise.all(flight.seats.map(async (seat) => {
      if (seat.isBooked) return null;
      const lockKey = `lock:${req.params.flightId}:${seat.seatNumber}`;
      const ownerId = await redisClient.get(lockKey);
      if (!ownerId) return null;
      const ttl = await redisClient.ttl(lockKey);
      if (ttl <= 0) return null;
      return {
        seatNumber: seat.seatNumber,
        isMine: ownerId === req.user._id.toString(),
        expiresAt: Date.now() + ttl * 1000
      };
    }));

    res.json(locks.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/release-seat', protect, async (req, res) => {
  const { flightId, seatNumber } = req.body;
  if (!flightId || !seatNumber) {
    return res.status(400).json({ message: 'Flight and seat are required.' });
  }

  try {
    const lockKey = `lock:${flightId}:${seatNumber}`;
    const released = await redisClient.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      {
        keys: [lockKey],
        arguments: [req.user._id.toString()]
      }
    );

    if (released === 1) {
      clearLockExpiryTimer(lockKey);
      req.app.get('io').to(`flight:${flightId}`).emit('seatUnlocked', { flightId, seatNumber });
    }
    res.json({ released: released === 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    clearLockExpiryTimer(lockKey);
    req.app.get('io').to(`flight:${flightId}`).emit('seatBooked', { flightId, seatNumber });

    let confirmationQueued = false;
    try {
      await bookingQueue.add(
        'send-booking-confirmation',
        { bookingId: booking._id.toString() },
        { jobId: `booking-confirmation-${booking._id}` }
      );
      confirmationQueued = true;
    } catch (queueError) {
      console.error('Could not queue booking confirmation:', queueError.message);
    }

    res.status(201).json({ ...booking.toObject(), confirmationQueued });

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
