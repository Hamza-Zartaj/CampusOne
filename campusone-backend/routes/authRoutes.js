import express from 'express';
import {
  register,
  login,
  verify2FAToken,
  setup2FA,
  enable2FA,
  disable2FA,
  getTrustedDevices,
  removeTrustedDevice,
  logout,
  getMe,
  completeFirstTimeSetup,
  skip2FASetup,
  setupEmail2FA,
  enableEmail2FA,
  sendLoginOTP,
  verifyEmailOTP,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  sendVerificationOTP,
  recoverSuperAdmin,
  updateMyEmail
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/verify-2fa', verify2FAToken);
router.post('/send-login-otp', sendLoginOTP);
router.post('/verify-email-otp', verifyEmailOTP);

// Password reset routes (public)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Super admin recovery via one-time key (public)
router.post('/recover-super-admin', recoverSuperAdmin);

// Protected routes (require authentication)
router.use(protect); // All routes below require authentication

router.get('/me', getMe);
router.post('/logout', logout);

// First-time setup routes
router.post('/first-time-setup', completeFirstTimeSetup);
router.post('/skip-2fa-setup', skip2FASetup);

// Admin-only routes
router.post('/register', authorize('admin'), register); // Only admins can register new users

// 2FA Management
router.post('/setup-2fa', setup2FA);
router.post('/enable-2fa', enable2FA);
router.post('/disable-2fa', disable2FA);
router.post('/setup-email-2fa', setupEmail2FA);
router.post('/enable-email-2fa', enableEmail2FA);

// Trusted Devices Management
router.get('/trusted-devices', getTrustedDevices);
router.delete('/trusted-devices/:deviceId', removeTrustedDevice);

// Change Password
router.post('/change-password', changePassword);

// Send verification OTP for security operations
router.post('/send-verification-otp', sendVerificationOTP);

// Update own email (first-time = no OTP; with email-2FA = OTP required)
router.put('/my-email', updateMyEmail);

export default router;
