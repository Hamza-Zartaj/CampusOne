import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import TA from '../models/TA.js';
import Admin from '../models/Admin.js';
import { generateDeviceFingerprint, generateDeviceName } from '../middleware/auth.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Get role-specific data
const getRoleData = async (userId, role) => {
  let roleData = null;
  
  switch (role) {
    case 'student':
      roleData = await Student.findOne({ userId }).populate('enrolledCourses.courseId completedCourses.courseId');
      break;
    case 'teacher':
      roleData = await Teacher.findOne({ userId }).populate('teachingCourses');
      break;
    case 'ta':
      roleData = await TA.findOne({ userId }).populate('assignedCourses');
      break;
    case 'admin':
      roleData = await Admin.findOne({ userId });
      break;
  }
  
  return roleData;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      profilePicture,
      // Student specific
      enrollmentNumber,
      department,
      batch,
      currentSemester,
      phone,
      dateOfBirth,
      address,
      guardianContact,
      // Teacher specific
      employeeId,
      qualification,
      specialization,
      // Admin specific
      adminLevel
    } = req.body;

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
        message: 'Invalid role. Must be student, teacher, ta, or admin'
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User record
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      profilePicture: profilePicture || undefined
    });

    // Create role-specific record
    let roleRecord = null;

    if (role === 'student') {
      if (!enrollmentNumber || !department) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message: 'Enrollment number and department are required for students'
        });
      }

      roleRecord = await Student.create({
        userId: user._id,
        enrollmentNumber,
        department,
        batch: batch || undefined,
        currentSemester: currentSemester || 1,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined,
        guardianContact: guardianContact || undefined
      });
    } else if (role === 'teacher') {
      if (!employeeId || !department) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message: 'Employee ID and department are required for teachers'
        });
      }

      roleRecord = await Teacher.create({
        userId: user._id,
        employeeId,
        department,
        qualification: qualification || undefined,
        specialization: specialization || undefined,
        phone: phone || undefined,
        officeHours: undefined
      });
    } else if (role === 'ta') {
      if (!enrollmentNumber || !department) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message: 'Enrollment number and department are required for TAs'
        });
      }

      roleRecord = await TA.create({
        userId: user._id,
        enrollmentNumber,
        department,
        currentSemester: currentSemester || 1
      });
    } else if (role === 'admin') {
      roleRecord = await Admin.create({
        userId: user._id,
        adminLevel: adminLevel || 'standard',
        department: department || 'General'
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user (include password for verification)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.'
      });
    }

    // Check if account is locked
    if (user.accountLocked) {
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        return res.status(401).json({
          success: false,
          message: `Account is locked until ${user.accountLockedUntil.toLocaleString()}. Too many failed login attempts.`
        });
      } else {
        // Unlock if time has passed
        user.accountLocked = false;
        user.accountLockedUntil = null;
        user.failedLoginAttempts = 0;
        await user.save();
      }
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account if 5 or more failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.accountLocked = true;
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        await user.save();

        return res.status(401).json({
          success: false,
          message: 'Account locked due to too many failed login attempts. Please try again after 30 minutes.'
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${5 - user.failedLoginAttempts} attempts remaining.`
      });
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    // Get device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(req);
    const deviceName = generateDeviceName(req);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if device is trusted
    const trustedDevice = user.trustedDevices.find(
      device => device.deviceId === deviceFingerprint
    );

    // If 2FA is enabled and device is not trusted, require 2FA
    if (user.twoFactorEnabled && !trustedDevice) {
      return res.status(200).json({
        success: true,
        message: '2FA_REQUIRED',
        userId: user._id,
        deviceFingerprint,
        deviceName
      });
    }

    // Update trusted device last used time
    if (trustedDevice) {
      trustedDevice.lastUsed = new Date();
      await user.save();
    }

    // Get role-specific data
    const roleData = await getRoleData(user._id, user.role);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        twoFactorEnabled: user.twoFactorEnabled,
        roleData
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Verify 2FA token and complete login
// @route   POST /api/auth/verify-2fa
// @access  Public
export const verify2FAToken = async (req, res) => {
  try {
    const { userId, token, deviceFingerprint, deviceName, trustDevice } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'User ID and 2FA token are required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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

    // If user wants to trust this device, add it to trusted devices
    if (trustDevice && deviceFingerprint) {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Check if device already exists
      const existingDevice = user.trustedDevices.find(
        device => device.deviceId === deviceFingerprint
      );

      if (!existingDevice) {
        user.trustedDevices.push({
          deviceId: deviceFingerprint,
          deviceName: deviceName || 'Unknown Device',
          ipAddress,
          lastUsed: new Date()
        });
        await user.save();
      }
    }

    // Get role-specific data
    const roleData = await getRoleData(user._id, user.role);

    // Generate token
    const jwtToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: '2FA verification successful',
      token: jwtToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        twoFactorEnabled: user.twoFactorEnabled,
        roleData
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA token',
      error: error.message
    });
  }
};

// @desc    Setup 2FA (generate QR code)
// @route   POST /api/auth/setup-2fa
// @access  Private
export const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CampusOne (${user.email})`
    });

    // Save secret temporarily (will be confirmed when user enables 2FA)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      message: '2FA setup initiated',
      qrCode: qrCodeUrl,
      secret: secret.base32
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up 2FA',
      error: error.message
    });
  }
};

// @desc    Enable 2FA
// @route   POST /api/auth/enable-2fa
// @access  Private
export const enable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: '2FA token is required'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Please setup 2FA first'
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

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling 2FA',
      error: error.message
    });
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/disable-2fa
// @access  Private
export const disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: 'Password and 2FA token are required'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

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

    // Disable 2FA and clear trusted devices
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.trustedDevices = [];
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling 2FA',
      error: error.message
    });
  }
};

// @desc    Get trusted devices
// @route   GET /api/auth/trusted-devices
// @access  Private
export const getTrustedDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      trustedDevices: user.trustedDevices
    });
  } catch (error) {
    console.error('Get trusted devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trusted devices',
      error: error.message
    });
  }
};

// @desc    Remove trusted device
// @route   DELETE /api/auth/trusted-devices/:deviceId
// @access  Private
export const removeTrustedDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove device from trusted devices
    user.trustedDevices = user.trustedDevices.filter(
      device => device.deviceId !== deviceId
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Device removed successfully'
    });
  } catch (error) {
    console.error('Remove device error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing device',
      error: error.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    // In a JWT-based auth, logout is typically handled client-side by removing the token
    // But we can add server-side logic if needed (e.g., token blacklisting)

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get role-specific data
    const roleData = await getRoleData(user._id, user.role);

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        twoFactorEnabled: user.twoFactorEnabled,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        roleData
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
};
