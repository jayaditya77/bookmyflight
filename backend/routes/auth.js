const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const createSecureToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
};

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const verificationUrl = (token) =>
  `${frontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;

const resetUrl = (token) =>
  `${frontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

const setVerificationToken = (user) => {
  const { token, hashedToken } = createSecureToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const user = await User.create({ name, email: normalizedEmail, password, phone, role: assignedRole });
    const token = setVerificationToken(user);
    await user.save();

    let emailSent = true;
    try {
      await sendVerificationEmail(user.email, verificationUrl(token));
    } catch (error) {
      emailSent = false;
      console.error('Verification email failed:', error.message);
    }

    res.status(201).json({
      message: emailSent
        ? 'Account created. Check your email to verify your account.'
        : 'Account created, but we could not send the verification email. Please request a new one.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email address before signing in.',
        requiresEmailVerification: true
      });
    }
    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify an email address using the one-time link sent during registration.
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Verification token is required.' });

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'This verification link is invalid or has expired.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not verify email. Please try again.' });
  }
});

// Send a fresh verification link. The response does not reveal whether an account exists.
router.post('/resend-verification', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  try {
    const user = await User.findOne({ email });
    if (user && !user.isEmailVerified) {
      const token = setVerificationToken(user);
      await user.save();
      await sendVerificationEmail(user.email, verificationUrl(token));
    }
  } catch (err) {
    console.error('Verification resend failed:', err.message);
  }

  res.json({ message: 'If that address belongs to an unverified account, a verification link has been sent.' });
});

// Request a password reset link. The response does not reveal whether an account exists.
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  try {
    const user = await User.findOne({ email });
    if (user) {
      const { token, hashedToken } = createSecureToken();
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await sendPasswordResetEmail(user.email, resetUrl(token));
    }
  } catch (err) {
    console.error('Password reset request failed:', err.message);
  }

  res.json({ message: 'If that address belongs to an account, a password reset link has been sent.' });
});

// Reset a password using the one-time link sent to the account email address.
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'A valid reset token and a password of at least 6 characters are required.' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'This password-reset link is invalid or has expired.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not reset password. Please try again.' });
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
