import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to protect routes - verify JWT token
 * Adds user object to req.user
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token is invalid.'
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated. Please contact admin.'
        });
      }

      // Check if account is locked
      if (req.user.accountLocked) {
        // Check if lock has expired
        if (req.user.accountLockedUntil && req.user.accountLockedUntil < Date.now()) {
          // Unlock account
          req.user.accountLocked = false;
          req.user.accountLockedUntil = null;
          req.user.failedLoginAttempts = 0;
          await req.user.save();
        } else {
          return res.status(401).json({
            success: false,
            message: 'Your account is locked due to multiple failed login attempts. Please try again later or contact admin.',
            lockedUntil: req.user.accountLockedUntil
          });
        }
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token is invalid or expired.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: error.message
    });
  }
};

/**
 * Middleware to authorize specific roles
 * Usage: authorize('admin', 'teacher')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to authorize Super Admin only
 * Only Super Admins can create/delete admin accounts
 */
export const authorizeSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login first.'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admins can perform this action.'
      });
    }

    // Import Admin model dynamically to avoid circular dependencies
    const Admin = (await import('../models/Admin.js')).default;
    const adminRecord = await Admin.findOne({ userId: req.user._id });

    if (!adminRecord || !adminRecord.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admins can perform this action.'
      });
    }

    req.adminRecord = adminRecord;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying Super Admin status',
      error: error.message
    });
  }
};

/**
 * Middleware to verify 2FA token
 * Used during login when 2FA is enabled
 */
export const verify2FA = async (req, res, next) => {
  try {
    const { token, userId } = req.body;

    if (!token || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide 2FA token and user ID'
      });
    }

    // Get user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this user'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before and after
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying 2FA token',
      error: error.message
    });
  }
};

/**
 * Middleware to check if device is trusted
 * Generates device fingerprint from request
 */
export const checkDeviceTrust = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Generate device fingerprint
    const deviceFingerprint = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceName: extractDeviceName(req.headers['user-agent'])
    };

    // Check if device exists in trusted devices
    const isTrusted = user.trustedDevices.some(device => 
      device.deviceId === generateDeviceId(deviceFingerprint)
    );

    req.deviceFingerprint = deviceFingerprint;
    req.isTrustedDevice = isTrusted;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking device trust',
      error: error.message
    });
  }
};

/**
 * Helper function to extract device name from user agent
 */
const extractDeviceName = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Extract browser
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  // Extract OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return `${browser} on ${os}`;
};

/**
 * Helper function to generate consistent device ID
 */
const generateDeviceId = (fingerprint) => {
  const { userAgent, ipAddress } = fingerprint;
  // Create a hash-like ID from user agent and IP
  return Buffer.from(`${userAgent}-${ipAddress}`).toString('base64').substring(0, 32);
};

/**
 * Middleware to add device to trusted devices if requested
 */
export const addTrustedDevice = async (req, res, next) => {
  try {
    const { rememberDevice } = req.body;
    
    if (rememberDevice && req.user && req.deviceFingerprint) {
      const deviceId = generateDeviceId(req.deviceFingerprint);
      
      // Check if device already exists
      const deviceExists = req.user.trustedDevices.some(d => d.deviceId === deviceId);
      
      if (!deviceExists) {
        req.user.trustedDevices.push({
          deviceId: deviceId,
          deviceName: req.deviceFingerprint.deviceName,
          ipAddress: req.deviceFingerprint.ipAddress,
          lastUsed: Date.now()
        });
        await req.user.save();
      }
    }
    
    next();
  } catch (error) {
    // Don't fail the request if device trust fails
    console.error('Error adding trusted device:', error);
    next();
  }
};

/**
 * Middleware to authorize based on admin permissions
 * Super Admins can do everything, regular admins need specific permissions
 * Usage: authorizePermission('manage_users')
 */
export const authorizePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized. Please login first.'
        });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only admins can perform this action.'
        });
      }

      // Import Admin model dynamically to avoid circular dependencies
      const Admin = (await import('../models/Admin.js')).default;
      const adminRecord = await Admin.findOne({ userId: req.user._id });

      if (!adminRecord) {
        return res.status(403).json({
          success: false,
          message: 'Admin record not found. Please contact system administrator.'
        });
      }

      // Super Admins bypass permission checks
      if (adminRecord.isSuperAdmin) {
        req.adminRecord = adminRecord;
        req.isSuperAdmin = true;
        return next();
      }

      // Check if admin has all required permissions
      const hasPermissions = requiredPermissions.every(permission =>
        adminRecord.permissions.includes(permission)
      );

      if (!hasPermissions) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
        });
      }

      req.adminRecord = adminRecord;
      req.isSuperAdmin = false;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error verifying permissions',
        error: error.message
      });
    }
  };
};

export default { protect, authorize, authorizeSuperAdmin, verify2FA, checkDeviceTrust, addTrustedDevice, authorizePermission };
