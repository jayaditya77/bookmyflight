const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const { protect, adminOnly } = require('../middleware/auth');

// Search flights (public)
router.get('/search', async (req, res) => {
  const { origin, destination, date } = req.query;
  try {
    const query = { status: 'scheduled' };
    if (origin) query.originCode = origin.toUpperCase();
    if (destination) query.destinationCode = destination.toUpperCase();
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.departureDate = { $gte: start, $lt: end };
    }
    const flights = await Flight.find(query).select('-seats');
    res.json(flights);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all flights (public)
router.get('/', async (req, res) => {
  try {
    const flights = await Flight.find({ status: 'scheduled' }).select('-seats');
    res.json(flights);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single flight with seats (protected)
router.get('/:id', protect, async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });
    res.json(flight);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add flight (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const flight = await Flight.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json(flight);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update flight (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!flight) return res.status(404).json({ message: 'Flight not found' });
    res.json(flight);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete flight (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });
    res.json({ message: 'Flight deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
