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
  getMe
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/verify-2fa', verify2FAToken);

// Protected routes (require authentication)
router.use(protect); // All routes below require authentication

router.get('/me', getMe);
router.post('/logout', logout);

// Admin-only routes
router.post('/register', authorize('admin'), register); // Only admins can register new users

// 2FA Management
router.post('/setup-2fa', setup2FA);
router.post('/enable-2fa', enable2FA);
router.post('/disable-2fa', disable2FA);

// Trusted Devices Management
router.get('/trusted-devices', getTrustedDevices);
router.delete('/trusted-devices/:deviceId', removeTrustedDevice);

export default router;
