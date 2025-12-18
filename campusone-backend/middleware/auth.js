import jwt from 'jsonwebtoken';
import { v5 as uuidv5 } from 'uuid';
import User from '../models/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact admin.'
        });
      }

      // Check if account is locked
      if (req.user.accountLocked && req.user.accountLockedUntil > new Date()) {
        return res.status(401).json({
          success: false,
          message: `Account is locked until ${req.user.accountLockedUntil.toLocaleString()}`
        });
      }

      // If account lock time expired, unlock it
      if (req.user.accountLocked && req.user.accountLockedUntil <= new Date()) {
        req.user.accountLocked = false;
        req.user.accountLockedUntil = null;
        req.user.failedLoginAttempts = 0;
        await req.user.save();
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Authorize roles - check if user has required role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Verify 2FA token
export const verify2FA = async (req, res, next) => {
  try {
    // If 2FA is not enabled for user, skip verification
    if (!req.user.twoFactorEnabled) {
      return next();
    }

    // Check if 2FA token is provided
    const { twoFactorToken } = req.body;

    if (!twoFactorToken) {
      return res.status(400).json({
        success: false,
        message: '2FA token is required'
      });
    }

    // Verify 2FA token using speakeasy
    const speakeasy = (await import('speakeasy')).default;
    const verified = speakeasy.totp.verify({
      secret: req.user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorToken,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    next();
  } catch (error) {
    console.error('2FA verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying 2FA token'
    });
  }
};

// Check if device is trusted
export const checkDeviceTrust = async (req, res, next) => {
  try {
    // If 2FA is not enabled, skip device check
    if (!req.user.twoFactorEnabled) {
      return next();
    }

    // Get device fingerprint from request
    const deviceFingerprint = generateDeviceFingerprint(req);

    // Check if device is in trusted devices list
    const trustedDevice = req.user.trustedDevices.find(
      device => device.deviceId === deviceFingerprint
    );

    if (!trustedDevice) {
      return res.status(403).json({
        success: false,
        message: '2FA_REQUIRED',
        deviceFingerprint
      });
    }

    // Update last used time
    trustedDevice.lastUsed = new Date();
    await req.user.save();

    next();
  } catch (error) {
    console.error('Device trust check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking device trust'
    });
  }
};

// Generate device fingerprint
export const generateDeviceFingerprint = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  
  // Create a namespace UUID (you can use any UUID here)
  const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  
  // Generate UUID based on user agent and IP
  const fingerprint = uuidv5(`${userAgent}-${ipAddress}`, NAMESPACE);
  
  return fingerprint;
};

// Generate device name from user agent
export const generateDeviceName = (req) => {
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  
  // Simple parsing of user agent (you can use a library like 'ua-parser-js' for better parsing)
  let deviceName = 'Unknown Device';
  
  if (userAgent.includes('Chrome')) {
    deviceName = 'Chrome Browser';
  } else if (userAgent.includes('Firefox')) {
    deviceName = 'Firefox Browser';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    deviceName = 'Safari Browser';
  } else if (userAgent.includes('Edge')) {
    deviceName = 'Edge Browser';
  }
  
  if (userAgent.includes('Windows')) {
    deviceName += ' on Windows';
  } else if (userAgent.includes('Mac')) {
    deviceName += ' on Mac';
  } else if (userAgent.includes('Linux')) {
    deviceName += ' on Linux';
  } else if (userAgent.includes('Android')) {
    deviceName += ' on Android';
  } else if (userAgent.includes('iOS')) {
    deviceName += ' on iOS';
  }
  
  return deviceName;
};
