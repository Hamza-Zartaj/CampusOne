import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import TA from '../models/TA.js';
import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Get role-specific data based on user role
 */
const getRoleSpecificData = async (userId, role) => {
  let roleData = null;
  
  switch (role) {
    case 'student':
      roleData = await Student.findOne({ userId }).populate('enrolledCourses.courseId');
      break;
    case 'teacher':
      roleData = await Teacher.findOne({ userId }).populate('teachingCourses.courseId');
      break;
    case 'ta':
      roleData = await TA.findOne({ userId }).populate('assignedCourses.courseId');
      break;
    case 'admin':
      roleData = await Admin.findOne({ userId });
      break;
  }
  
  return roleData;
};

/**
 * @desc    Register a new user (Admin only)
 * @route   POST /api/auth/register
 * @access  Private/Admin
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, role, ...roleSpecificData } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role'
      });
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'ta', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create base user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook in User model
      role
    });

    // Create role-specific record
    let roleRecord;
    try {
      switch (role) {
        case 'student':
          const { enrollmentNumber, department, batch, currentSemester } = roleSpecificData;
          if (!enrollmentNumber || !department) {
            throw new Error('Please provide enrollmentNumber and department for student');
          }
          roleRecord = await Student.create({
            userId: user._id,
            enrollmentNumber,
            department,
            batch,
            currentSemester: currentSemester || 1
          });
          break;

        case 'teacher':
          const { employeeId: teacherEmpId, department: teacherDept, designation } = roleSpecificData;
          if (!teacherEmpId || !teacherDept) {
            throw new Error('Please provide employeeId and department for teacher');
          }
          roleRecord = await Teacher.create({
            userId: user._id,
            employeeId: teacherEmpId,
            department: teacherDept,
            designation: designation || 'Lecturer'
          });
          break;

        case 'ta':
          const { studentId } = roleSpecificData;
          if (!studentId) {
            throw new Error('Please provide studentId for TA (TA must be a student)');
          }
          roleRecord = await TA.create({
            userId: user._id,
            studentId
          });
          break;

        case 'admin':
          const { employeeId: adminEmpId, department: adminDept, designation: adminDesig } = roleSpecificData;
          if (!adminEmpId || !adminDept) {
            throw new Error('Please provide employeeId and department for admin');
          }
          roleRecord = await Admin.create({
            userId: user._id,
            employeeId: adminEmpId,
            department: adminDept,
            designation: adminDesig || 'Administrator'
          });
          break;
      }
    } catch (roleError) {
      // If role-specific record creation fails, delete the user
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({
        success: false,
        message: roleError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        roleData: roleRecord
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password, rememberDevice } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user (include password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.accountLocked) {
      if (user.accountLockedUntil && user.accountLockedUntil < Date.now()) {
        // Unlock account
        user.accountLocked = false;
        user.accountLockedUntil = null;
        user.failedLoginAttempts = 0;
        await user.save();
      } else {
        return res.status(401).json({
          success: false,
          message: 'Account is locked due to multiple failed login attempts. Please try again later.',
          lockedUntil: user.accountLockedUntil
        });
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account if failed attempts >= 5
      if (user.failedLoginAttempts >= 5) {
        user.accountLocked = true;
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        await user.save();

        return res.status(401).json({
          success: false,
          message: 'Account locked due to multiple failed login attempts. Please try again after 30 minutes.'
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: 5 - user.failedLoginAttempts
      });
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = Date.now();

    // Generate device fingerprint
    const deviceFingerprint = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceName: extractDeviceName(req.headers['user-agent'])
    };

    const deviceId = generateDeviceId(deviceFingerprint);

    // Check if device is trusted
    const trustedDevice = user.trustedDevices.find(d => d.deviceId === deviceId);
    const isTrusted = !!trustedDevice;

    // Update last used time for trusted device
    if (trustedDevice) {
      trustedDevice.lastUsed = Date.now();
    }

    await user.save();

    // Check if 2FA is enabled and device is not trusted
    if (user.twoFactorEnabled && !isTrusted) {
      return res.status(200).json({
        success: true,
        requires2FA: true,
        message: '2FA verification required',
        userId: user._id
      });
    }

    // Add device to trusted devices if requested
    if (rememberDevice && !isTrusted) {
      user.trustedDevices.push({
        deviceId,
        deviceName: deviceFingerprint.deviceName,
        ipAddress: deviceFingerprint.ipAddress,
        lastUsed: Date.now()
      });
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    // Get role-specific data
    const roleData = await getRoleSpecificData(user._id, user.role);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          twoFactorEnabled: user.twoFactorEnabled
        },
        roleData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

/**
 * @desc    Verify 2FA token and complete login
 * @route   POST /api/auth/verify-2fa
 * @access  Public
 */
export const verify2FAToken = async (req, res) => {
  try {
    const { userId, token, rememberDevice } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and 2FA token'
      });
    }

    // Fetch user with twoFactorSecret (since it has select: false in model)
    const user = await User.findById(userId).select('+twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    // Generate device fingerprint
    const deviceFingerprint = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceName: extractDeviceName(req.headers['user-agent'])
    };

    const deviceId = generateDeviceId(deviceFingerprint);

    // Add device to trusted devices if requested
    if (rememberDevice) {
      const deviceExists = user.trustedDevices.some(d => d.deviceId === deviceId);
      
      if (!deviceExists) {
        user.trustedDevices.push({
          deviceId,
          deviceName: deviceFingerprint.deviceName,
          ipAddress: deviceFingerprint.ipAddress,
          lastUsed: Date.now()
        });
      }
    }

    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const jwtToken = generateToken(user._id);

    // Get role-specific data
    const roleData = await getRoleSpecificData(user._id, user.role);

    res.status(200).json({
      success: true,
      message: '2FA verification successful',
      token: jwtToken,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          twoFactorEnabled: user.twoFactorEnabled
        },
        roleData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA token',
      error: error.message
    });
  }
};

/**
 * @desc    Setup 2FA - Generate secret and QR code
 * @route   POST /api/auth/setup-2fa
 * @access  Private
 */
export const setup2FA = async (req, res) => {
  try {
    // Fetch user with twoFactorSecret field (since it has select: false in model)
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CampusOne (${user.email})`,
      length: 32
    });

    // Save secret to user (temporary, until confirmed)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      message: '2FA setup initiated. Scan the QR code with your authenticator app.',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting up 2FA',
      error: error.message
    });
  }
};

/**
 * @desc    Enable 2FA after verification
 * @route   POST /api/auth/enable-2fa
 * @access  Private
 */
export const enable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    // Fetch user with twoFactorSecret (since it has select: false in model)
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide verification token from authenticator app'
      });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Please setup 2FA first using /api/auth/setup-2fa'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please try again.'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA has been enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enabling 2FA',
      error: error.message
    });
  }
};

/**
 * @desc    Disable 2FA
 * @route   POST /api/auth/disable-2fa
 * @access  Private
 */
export const disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;
    // Fetch user with password and twoFactorSecret (both have select: false in model)
    const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide password and 2FA token'
      });
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.trustedDevices = []; // Clear trusted devices
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA has been disabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error disabling 2FA',
      error: error.message
    });
  }
};

/**
 * @desc    Get trusted devices
 * @route   GET /api/auth/trusted-devices
 * @access  Private
 */
export const getTrustedDevices = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        trustedDevices: user.trustedDevices
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trusted devices',
      error: error.message
    });
  }
};

/**
 * @desc    Remove trusted device
 * @route   DELETE /api/auth/trusted-devices/:deviceId
 * @access  Private
 */
export const removeTrustedDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = req.user;

    user.trustedDevices = user.trustedDevices.filter(d => d.deviceId !== deviceId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Device removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing device',
      error: error.message
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // In JWT, logout is handled client-side by removing token
    // But we can add additional logic here if needed
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = req.user;

    // Get role-specific data
    const roleData = await getRoleSpecificData(user._id, user.role);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          twoFactorEnabled: user.twoFactorEnabled,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        },
        roleData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
};

// Helper functions
const extractDeviceName = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return `${browser} on ${os}`;
};

const generateDeviceId = (fingerprint) => {
  const { userAgent, ipAddress } = fingerprint;
  return Buffer.from(`${userAgent}-${ipAddress}`).toString('base64').substring(0, 32);
};

export default {
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
};
