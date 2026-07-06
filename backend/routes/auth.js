const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Send OTP Endpoint
router.post('/send-otp', [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('role', 'Role is required').isIn(['client', 'worker'])
], authController.sendOTP);

// Verify OTP Endpoint
router.post('/verify-otp', [
  body('email', 'Please include a valid email').isEmail(),
  body('otp', 'OTP is required').not().isEmpty()
], authController.verifyOTP);

// Register Endpoint
router.post('/register', [
  body('verificationToken', 'Verification token is required').not().isEmpty(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], authController.register);

// Login Endpoint
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], authController.login);

// Forgot Password Endpoint
router.post('/forgot-password', [
  body('email', 'Please include a valid email').isEmail()
], authController.forgotPassword);

// Reset Password Endpoint
router.post('/reset-password', [
  body('token', 'Reset token is required').not().isEmpty(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], authController.resetPassword);

// Verify Token Endpoint - Protected route to verify token validity
router.get('/verify-token', protect, authController.verifyToken);

// Logout Endpoint
router.post('/logout', protect, authController.logout);

module.exports = router;
