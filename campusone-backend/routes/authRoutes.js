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
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-2fa', verify2FAToken);

// Protected routes (require authentication)
router.post('/setup-2fa', protect, setup2FA);
router.post('/enable-2fa', protect, enable2FA);
router.post('/disable-2fa', protect, disable2FA);
router.get('/trusted-devices', protect, getTrustedDevices);
router.delete('/trusted-devices/:deviceId', protect, removeTrustedDevice);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
