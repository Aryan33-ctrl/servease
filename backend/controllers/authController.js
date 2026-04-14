const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const { sendSuccess } = require('../utils/response');
const { sendOTPEmail, sendPasswordResetEmail } = require('../utils/email');

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP for registration
exports.sendOTP = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ array: () => errors.array() });
  }

  try {
    const { name, email, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Check if pending registration exists
    let pending = await PendingRegistration.findOne({ email });
    if (pending) {
      // Allow resend if expired or recent
      if (pending.otpExpires > Date.now()) {
        return res.status(400).json({ success: false, message: 'OTP already sent. Please check your email.' });
      }
      // Delete expired pending
      await PendingRegistration.deleteOne({ email });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create pending registration
    pending = new PendingRegistration({
      name,
      email,
      role: role || 'client',
      otp,
      otpExpires
    });

    await pending.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }

    sendSuccess(res, { email }, 'OTP sent successfully. Please check your email.');
  } catch (err) {
    next(err);
  }
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ array: () => errors.array() });
  }

  try {
    const { email, otp } = req.body;

    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      return res.status(400).json({ success: false, message: 'No pending registration found' });
    }

    if (pending.retryCount >= 3) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({ success: false, message: 'Too many failed attempts. Please start registration again.' });
    }

    if (pending.otp !== otp) {
      pending.retryCount += 1;
      await pending.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (pending.otpExpires < Date.now()) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { email: pending.email, purpose: 'register' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    sendSuccess(res, { verificationToken }, 'OTP verified successfully. You can now set your password.');
  } catch (err) {
    next(err);
  }
};

// Complete Registration
exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ array: () => errors.array() });
  }

  try {
    const { verificationToken, password } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    if (decoded.purpose !== 'register') {
      return res.status(400).json({ success: false, message: 'Invalid token purpose' });
    }

    const email = decoded.email;

    // Find pending registration
    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      return res.status(400).json({ success: false, message: 'No pending registration found' });
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name: pending.name,
      email: pending.email,
      password: hashedPassword,
      role: pending.role,
      isVerified: true
    });

    await user.save();

    // Delete pending registration
    await PendingRegistration.deleteOne({ email });

    // Generate JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    sendSuccess(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }
    }, 'Registration completed successfully');
  } catch (err) {
    next(err);
  }
};

// Login User
exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ array: () => errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Please verify your email before logging in' });
    }

    // Generate JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    sendSuccess(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ array: () => errors.array() });
  }

  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send email' });
    }

    sendSuccess(res, {}, 'Password reset email sent');
  } catch (err) {
    next(err);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ array: () => errors.array() });
  }

  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    sendSuccess(res, {}, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};
