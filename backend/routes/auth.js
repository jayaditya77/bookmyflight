const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Register (Tourist or Admin)
router.post('/register', async (req, res) => {
  const { name, email, password, phone, role, adminSecret } = req.body;

  // If registering as admin, validate the secret
  if (role === 'admin') {
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: 'Invalid admin secret code' });
    }
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const user = await User.create({ name, email, password, phone, role: assignedRole });

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upgrade tourist to admin
router.post('/upgrade-to-admin', protect, async (req, res) => {
  const { adminSecret } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ message: 'Invalid admin secret code' });
  }
  try {
    const user = await User.findById(req.user._id);
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Already an admin' });
    }
    user.role = 'admin';
    await user.save();
    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    if (req.body.password) user.password = req.body.password;
    const updated = await user.save();
    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
