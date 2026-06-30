import prisma from '../prisma/client.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { generateOTP, sendOTPEmail, send2FAEnabledEmail } from '../services/emailService.js';
import { uploadToStorage, deleteFromStorage, pathFromUrl } from '../utils/supabaseStorage.js';

const PROFILE_BUCKET = 'profile-pictures';

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
      roleData = await prisma.student.findUnique({
        where: { userId }
      });
      break;
    case 'teacher':
      roleData = await prisma.teacher.findUnique({
        where: { userId }
      });
      break;
    case 'admin':
      roleData = await prisma.admin.findUnique({
        where: { userId }
      });
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

    // Check if trying to create an admin account
    if (role === 'admin') {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can create admin accounts'
        });
      }

      const adminRecord = await prisma.admin.findUnique({
        where: { userId: req.user.id }
      });
      if (!adminRecord || !adminRecord.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can create admin accounts'
        });
      }
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Determine username based on role
    let username;
    switch (role) {
      case 'admin':
      case 'teacher':
        if (!roleSpecificData.employeeId) {
          return res.status(400).json({
            success: false,
            message: `Please provide employeeId for ${role}`
          });
        }
        username = roleSpecificData.employeeId.toLowerCase();
        break;
      case 'student':
        if (!roleSpecificData.studentId) {
          return res.status(400).json({
            success: false,
            message: 'Please provide studentId for student'
          });
        }
        username = roleSpecificData.studentId.toLowerCase();
        break;
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'User with this username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and role-specific record in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          username,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
          isFirstLogin: true
        }
      });

      let roleRecord;
      try {
        switch (role) {
          case 'student': {
            const { studentId, enrollmentYear, department, batch, currentSemester } = roleSpecificData;
            if (!studentId || !enrollmentYear || !department) {
              throw new Error('Please provide studentId, enrollmentYear, and department for student');
            }
            roleRecord = await tx.student.create({
              data: {
                userId: user.id,
                studentId,
                enrollmentYear,
                department,
                batch,
                currentSemester: currentSemester || 1
              }
            });
            break;
          }

          case 'teacher': {
            const { employeeId: teacherEmpId, department: teacherDept, designation } = roleSpecificData;
            if (!teacherEmpId || !teacherDept) {
              throw new Error('Please provide employeeId and department for teacher');
            }
            roleRecord = await tx.teacher.create({
              data: {
                userId: user.id,
                employeeId: teacherEmpId,
                department: teacherDept,
                designation: designation || 'Lecturer'
              }
            });
            break;
          }

    case 'admin': {
            const { employeeId: adminEmpId, department: adminDept, designation: adminDesig, isSuperAdmin } = roleSpecificData;
            if (!adminEmpId || !adminDept) {
              throw new Error('Please provide employeeId and department for admin');
            }
            
            const canCreateSuperAdmin = req.adminRecord && req.adminRecord.isSuperAdmin;
            
            roleRecord = await tx.admin.create({
              data: {
                userId: user.id,
                employeeId: adminEmpId,
                department: adminDept,
                designation: adminDesig || 'Administrator',
                isSuperAdmin: canCreateSuperAdmin && isSuperAdmin === true ? true : false
              }
            });
            break;
          }
        }
      } catch (roleError) {
        throw roleError;
      }

      return { user, roleRecord };
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role
        },
        roleData: result.roleRecord
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
    const { username, password, rememberDevice } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password'
      });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.accountLocked) {
      if (user.accountLockedUntil && user.accountLockedUntil < new Date()) {
        // Unlock account
        await prisma.user.update({
          where: { id: user.id },
          data: {
            accountLocked: false,
            accountLockedUntil: null,
            failedLoginAttempts: 0
          }
        });
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
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      // Increment failed login attempts
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: user.failedLoginAttempts + 1 }
      });

      // Lock account if failed attempts >= 5
      if (updated.failedLoginAttempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            accountLocked: true,
            accountLockedUntil: new Date(Date.now() + 30 * 60 * 1000)
          }
        });

        return res.status(401).json({
          success: false,
          message: 'Account locked due to multiple failed login attempts. Please try again after 30 minutes.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: 5 - updated.failedLoginAttempts
      });
    }

    // Reset failed login attempts on successful login
    const deviceFingerprint = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceName: extractDeviceName(req.headers['user-agent'])
    };

    const deviceId = generateDeviceId(deviceFingerprint);

    // Update user with lastLogin and check trusted devices
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLogin: new Date()
      }
    });

    const trustedDevice = await prisma.trustedDevice.findUnique({
      where: { userId_deviceId: { userId: user.id, deviceId } }
    });
    const isTrusted = !!trustedDevice;

    // Check if 2FA is enabled and device is not trusted
    if (user.twoFactorEnabled && !isTrusted) {
      if (user.twoFactorMethod === 'email') {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailOTP: otp,
            emailOTPExpiry: expiresAt
          }
        });

        await sendOTPEmail(user.email, user.name, otp);

        return res.status(200).json({
          success: true,
          requires2FA: true,
          twoFactorMethod: 'email',
          message: 'OTP sent to your email',
          userId: user.id,
          email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        });
      }

      return res.status(200).json({
        success: true,
        requires2FA: true,
        twoFactorMethod: 'authenticator',
        message: '2FA verification required',
        userId: user.id
      });
    }

    // Add device to trusted devices if requested
    if (rememberDevice && !isTrusted) {
      await prisma.trustedDevice.create({
        data: {
          userId: user.id,
          deviceId,
          deviceName: deviceFingerprint.deviceName || null,
          userAgent: deviceFingerprint.userAgent || null,
          ipAddress: deviceFingerprint.ipAddress || null
        }
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Get role-specific data
    const roleData = await getRoleSpecificData(user.id, user.role);

    // Check if this is first login
    if (user.isFirstLogin) {
      return res.status(200).json({
        success: true,
        isFirstLogin: true,
        message: 'First time login - password change required',
        token,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            twoFactorEnabled: user.twoFactorEnabled,
            isFirstLogin: user.isFirstLogin
          },
          roleData
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        user: {
          id: user.id,
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

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

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
      const existing = await prisma.trustedDevice.findUnique({
        where: { userId_deviceId: { userId: user.id, deviceId } }
      });
      if (!existing) {
        await prisma.trustedDevice.create({
          data: {
            userId: user.id,
            deviceId,
            deviceName: deviceFingerprint.deviceName || null,
            userAgent: deviceFingerprint.userAgent || null,
            ipAddress: deviceFingerprint.ipAddress || null
          }
        });
      } else {
        await prisma.trustedDevice.update({
          where: { userId_deviceId: { userId: user.id, deviceId } },
          data: { lastUsed: new Date() }
        });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate token
    const jwtToken = generateToken(user.id);

    // Get role-specific data
    const roleData = await getRoleSpecificData(user.id, user.role);

    res.status(200).json({
      success: true,
      message: '2FA verification successful',
      token: jwtToken,
      data: {
        user: {
          id: user.id,
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
    const user = req.user;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CampusOne (${user.email})`,
      length: 32
    });

    // Save secret to user (temporary, until confirmed)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32 }
    });

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
    const user = req.user;

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

    // Enable 2FA with authenticator method
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFactorMethod: 'authenticator' }
    });

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
    const user = req.user;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password'
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

    // Verify the 2FA token based on method
    if (user.twoFactorMethod === 'authenticator') {
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Please provide your authenticator code'
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authenticator code'
        });
      }
    } else if (user.twoFactorMethod === 'email') {
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Please provide the OTP sent to your email'
        });
      }

      if (!user.emailOTP || user.emailOTP !== token) {
        return res.status(401).json({
          success: false,
          message: 'Invalid OTP code'
        });
      }

      if (new Date() > user.emailOTPExpiry) {
        await prisma.user.update({ where: { id: user.id }, data: { emailOTP: null, emailOTPExpiry: null } });
        return res.status(401).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }
    }

    // Disable 2FA and clear trusted devices
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorMethod: null
        }
      }),
      prisma.trustedDevice.deleteMany({ where: { userId: user.id } })
    ]);

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
    const devices = await prisma.trustedDevice.findMany({
      where: { userId: req.user.id },
      orderBy: { lastUsed: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: {
        trustedDevices: devices
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

    const device = await prisma.trustedDevice.findUnique({
      where: { userId_deviceId: { userId: req.user.id, deviceId } }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    await prisma.trustedDevice.delete({
      where: { userId_deviceId: { userId: req.user.id, deviceId } }
    });

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
    const roleData = await getRoleSpecificData(user.id, user.role);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        passwordChangedAt: user.passwordChangedAt,
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

/**
 * @desc    Update the current user's own profile
 * @route   PUT /api/auth/my-profile
 * @access  Private
 */
export const updateMyProfile = async (req, res) => {
  try {
    const user = req.user;
    const {
      name,
      phone,
      dateOfBirth,
      address,
      guardianContact,
      officeRoom,
      officeHours,
      qualification,
      specialization,
      researchInterests,
    } = req.body;

    const userUpdateData = {};
    if (name !== undefined) userUpdateData.name = String(name).trim();

    const roleUpdateData = {};
    if (user.role === 'student') {
      if (phone !== undefined) roleUpdateData.phone = phone;
      if (dateOfBirth !== undefined) roleUpdateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (address !== undefined) roleUpdateData.address = address;
      if (guardianContact !== undefined) roleUpdateData.emergencyContact = guardianContact;
    }

    if (user.role === 'teacher') {
      if (phone !== undefined) roleUpdateData.phone = phone;
      if (officeRoom !== undefined) roleUpdateData.officeRoom = officeRoom;
      if (officeHours !== undefined) roleUpdateData.officeHours = officeHours;
      if (qualification !== undefined) roleUpdateData.qualification = qualification;
      if (specialization !== undefined) roleUpdateData.specialization = specialization;
      if (researchInterests !== undefined) roleUpdateData.researchInterests = researchInterests;
    }

    if (user.role === 'admin' && phone !== undefined) {
      roleUpdateData.phone = phone;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({ where: { id: user.id }, data: userUpdateData });
      }

      if (Object.keys(roleUpdateData).length > 0) {
        if (user.role === 'student') {
          await tx.student.update({ where: { userId: user.id }, data: roleUpdateData });
        } else if (user.role === 'teacher') {
          await tx.teacher.update({ where: { userId: user.id }, data: roleUpdateData });
        } else if (user.role === 'admin') {
          await tx.admin.update({ where: { userId: user.id }, data: roleUpdateData });
        }
      }
    });

    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    const roleData = await getRoleSpecificData(user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: freshUser.id,
        name: freshUser.name,
        username: freshUser.username,
        email: freshUser.email,
        role: freshUser.role,
        profilePicture: freshUser.profilePicture,
        twoFactorEnabled: freshUser.twoFactorEnabled,
        twoFactorMethod: freshUser.twoFactorMethod,
        isActive: freshUser.isActive,
        roleData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

/**
 * @desc    Complete first-time setup (change password and optionally enable 2FA)
 * @route   POST /api/auth/first-time-setup
 * @access  Private
 */
export const completeFirstTimeSetup = async (req, res) => {
  try {
    const { currentPassword, newPassword, enable2FA, twoFactorMethod } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
        passwordChangedAt: new Date()
      }
    });

    // If 2FA setup is requested
    let twoFactorData = null;
    if (enable2FA) {
      const method = twoFactorMethod || 'authenticator';
      
      if (method === 'email') {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
          where: { id: userId },
          data: {
            emailOTP: otp,
            emailOTPExpiry: expiresAt
          }
        });

        await sendOTPEmail(user.email, user.name, otp);

        twoFactorData = {
          method: 'email',
          email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          message: 'OTP sent to your email'
        };
      } else {
        // Generate authenticator secret
        const secret = speakeasy.generateSecret({
          name: `CampusOne (${user.email})`,
          length: 32
        });

        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorSecret: secret.base32 }
        });

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        twoFactorData = {
          method: 'authenticator',
          secret: secret.base32,
          qrCode: qrCodeUrl
        };
      }
    }

    res.status(200).json({
      success: true,
      message: 'First-time setup completed successfully',
      data: {
        passwordChanged: true,
        twoFactorSetup: enable2FA ? twoFactorData : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing first-time setup',
      error: error.message
    });
  }
};

/**
 * @desc    Skip 2FA setup during first-time login
 * @route   POST /api/auth/skip-2fa-setup
 * @access  Private
 */
export const skip2FASetup = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isFirstLogin: false }
    });

    res.status(200).json({
      success: true,
      message: '2FA setup skipped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error skipping 2FA setup',
      error: error.message
    });
  }
};

/**
 * @desc    Setup 2FA with Email OTP
 * @route   POST /api/auth/setup-email-2fa
 * @access  Private
 */
export const setupEmail2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailOTP: otp,
        emailOTPExpiry: expiresAt
      }
    });

    const emailResult = await sendOTPEmail(user.email, user.name, otp);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address',
      data: {
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        expiresIn: 600
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting up email 2FA',
      error: error.message
    });
  }
};

/**
 * @desc    Verify and enable Email OTP 2FA
 * @route   POST /api/auth/enable-email-2fa
 * @access  Private
 */
export const enableEmail2FA = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.id;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide OTP code'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.emailOTP) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
    }

    if (new Date() > user.emailOTPExpiry) {
      await prisma.user.update({
        where: { id: userId },
        data: { emailOTP: null, emailOTPExpiry: null }
      });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.emailOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code'
      });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: 'email',
        emailOTP: null,
        emailOTPExpiry: null,
        isFirstLogin: false
      }
    });

    await send2FAEnabledEmail(user.email, user.name, 'email');

    res.status(200).json({
      success: true,
      message: 'Email 2FA enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enabling email 2FA',
      error: error.message
    });
  }
};

/**
 * @desc    Send OTP for login verification
 * @route   POST /api/auth/send-login-otp
 * @access  Public
 */
export const sendLoginOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.twoFactorMethod !== 'email') {
      return res.status(400).json({
        success: false,
        message: 'Email 2FA is not enabled for this account'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailOTP: otp,
        emailOTPExpiry: expiresAt
      }
    });

    await sendOTPEmail(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending login OTP',
      error: error.message
    });
  }
};

/**
 * @desc    Verify email OTP for login
 * @route   POST /api/auth/verify-email-otp
 * @access  Public
 */
export const verifyEmailOTP = async (req, res) => {
  try {
    const { userId, otp, rememberDevice } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.emailOTP) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
    }

    if (new Date() > user.emailOTPExpiry) {
      await prisma.user.update({
        where: { id: userId },
        data: { emailOTP: null, emailOTPExpiry: null }
      });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.emailOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code'
      });
    }

    // Clear OTP and add device to trusted devices if requested
    const deviceFingerprint = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceName: extractDeviceName(req.headers['user-agent'])
    };

    const deviceId = generateDeviceId(deviceFingerprint);

    await prisma.user.update({
      where: { id: userId },
      data: { emailOTP: null, emailOTPExpiry: null }
    });

    if (rememberDevice) {
      const existing = await prisma.trustedDevice.findUnique({
        where: { userId_deviceId: { userId: user.id, deviceId } }
      });
      if (!existing) {
        await prisma.trustedDevice.create({
          data: {
            userId: user.id,
            deviceId,
            deviceName: deviceFingerprint.deviceName || null,
            userAgent: deviceFingerprint.userAgent || null,
            ipAddress: deviceFingerprint.ipAddress || null
          }
        });
      }
    }

    // Generate token
    const token = generateToken(user.id);

    // Get role-specific data
    const roleData = await getRoleSpecificData(user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        user: {
          id: user.id,
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
      message: 'Error verifying email OTP',
      error: error.message
    });
  }
};

/**
 * @desc    Request password reset - sends OTP based on user's MFA method or email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive verification instructions'
      });
    }

    const otp = generateOTP();

    if (user.twoFactorEnabled && user.twoFactorMethod === 'authenticator') {
      return res.status(200).json({
        success: true,
        message: 'Please enter the code from your authenticator app',
        data: {
          userId: user.id,
          method: 'authenticator'
        }
      });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailOTP: otp, emailOTPExpiry: expiresAt }
    });

    const emailResult = await sendOTPEmail(user.email, user.name, otp);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        userId: user.id,
        method: 'email',
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request',
      error: error.message
    });
  }
};

/**
 * @desc    Verify identity code for password reset
 * @route   POST /api/auth/verify-reset-code
 * @access  Public
 */
export const verifyResetCode = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and verification code'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let isValid = false;

    const usesAuthenticatorReset = user.twoFactorEnabled && user.twoFactorMethod === 'authenticator';

    // Verify based on the reset method selected when the code was requested.
    if (!usesAuthenticatorReset) {
      if (!user.emailOTP) {
        return res.status(400).json({
          success: false,
          message: 'No verification code found. Please request a new one.'
        });
      }

      if (!user.emailOTPExpiry || new Date() > user.emailOTPExpiry) {
        await prisma.user.update({
          where: { id: userId },
          data: { emailOTP: null, emailOTPExpiry: null }
        });
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        });
      }

      if (user.emailOTP !== code) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      isValid = true;
    } else {
      // Verify authenticator code
      if (!user.twoFactorSecret) {
        return res.status(400).json({
          success: false,
          message: '2FA not properly configured'
        });
      }

      isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Clear OTP if this reset used email verification.
    if (!usesAuthenticatorReset) {
      await prisma.user.update({
        where: { id: userId },
        data: { emailOTP: null, emailOTPExpiry: null }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification successful',
      data: {
        resetToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying code',
      error: error.message
    });
  }
};

/**
 * @desc    Reset password with verified token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reset token and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      
      if (decoded.purpose !== 'password-reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

/**
 * @desc    Send OTP for security operations (disable/switch 2FA) - authenticated
 * @route   POST /api/auth/send-verification-otp
 * @access  Private
 */
export const sendVerificationOTP = async (req, res) => {
  try {
    const user = req.user;

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailOTP: otp, emailOTPExpiry: expiresAt }
    });

    const emailResult = await sendOTPEmail(user.email, user.name, otp);
    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email',
      data: { email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
  }
};

/**
 * @desc    Change password for authenticated user
 * @route   POST /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Ensure new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

/**
 * @desc    Upload a profile picture for the current user. Stores the image
 *          in the Supabase 'profile-pictures' bucket and saves the public
 *          URL on User.profilePicture. Replaces any previous picture.
 * @route   POST /api/auth/profile-picture
 * @access  Private
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'Only image files are allowed' });
    }
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image must be 5 MB or smaller' });
    }

    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const filePath = `${req.user.id}/${uuidv4()}.${ext}`;
    const publicUrl = await uploadToStorage(PROFILE_BUCKET, filePath, req.file.buffer, req.file.mimetype);

    // Best-effort cleanup of the old picture
    if (req.user.profilePicture) {
      const oldPath = pathFromUrl(req.user.profilePicture, PROFILE_BUCKET);
      if (oldPath) await deleteFromStorage(PROFILE_BUCKET, oldPath);
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePicture: publicUrl },
    });

    res.status(200).json({ success: true, message: 'Profile picture updated', data: { profilePicture: publicUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error uploading profile picture', error: error.message });
  }
};

/**
 * @desc    Remove the current user's profile picture (deletes the file from
 *          Supabase storage and clears User.profilePicture).
 * @route   DELETE /api/auth/profile-picture
 * @access  Private
 */
export const removeProfilePicture = async (req, res) => {
  try {
    if (!req.user.profilePicture) {
      return res.status(400).json({ success: false, message: 'No profile picture to remove' });
    }

    const oldPath = pathFromUrl(req.user.profilePicture, PROFILE_BUCKET);
    if (oldPath) await deleteFromStorage(PROFILE_BUCKET, oldPath);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePicture: null },
    });

    res.status(200).json({ success: true, message: 'Profile picture removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing profile picture', error: error.message });
  }
};

/**
 * @desc    Update current user's email address.
 *          - During first-time login → no verification (default email is fake).
 *          - Otherwise, if user has email-based 2FA → require a valid OTP
 *            (issued via /auth/send-verification-otp).
 *          - Otherwise → updates directly (only the user themselves can hit this).
 * @route   PUT /api/auth/my-email
 * @access  Private
 */
export const updateMyEmail = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;

    if (!newEmail) {
      return res.status(400).json({ success: false, message: 'New email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const normalized = newEmail.toLowerCase().trim();
    if (normalized === req.user.email) {
      return res.status(400).json({ success: false, message: 'New email is the same as the current one' });
    }

    const existing = await prisma.user.findFirst({
      where: { email: normalized, id: { not: req.user.id } },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This email is already in use' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // OTP gate: only enforced when user is past first-time setup AND uses email 2FA
    if (!user.isFirstLogin && user.twoFactorEnabled && user.twoFactorMethod === 'email') {
      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required to change your email' });
      }
      if (!user.emailOTP || user.emailOTP !== otp) {
        return res.status(401).json({ success: false, message: 'Invalid OTP' });
      }
      if (new Date() > user.emailOTPExpiry) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailOTP: null, emailOTPExpiry: null },
        });
        return res.status(401).json({ success: false, message: 'OTP has expired' });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email: normalized, emailOTP: null, emailOTPExpiry: null },
    });

    res.status(200).json({ success: true, message: 'Email updated successfully', data: { email: normalized } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating email', error: error.message });
  }
};

/**
 * @desc    Recover super admin account using a one-time recovery key.
 *          Verifies username + key, consumes the key, unlocks the account,
 *          and returns a short-lived reset token to set a new password.
 * @route   POST /api/auth/recover-super-admin
 * @access  Public
 */
export const recoverSuperAdmin = async (req, res) => {
  try {
    const { username, recoveryKey } = req.body;

    if (!username || !recoveryKey) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and recovery key'
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      },
      include: { admin: true }
    });

    if (!user || !user.admin || !user.admin.isSuperAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or recovery key'
      });
    }

    const storedKeys = user.admin.recoveryKeys || [];
    if (storedKeys.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No recovery keys remain on this account. Contact another super admin.'
      });
    }

    // Find which stored hash matches the supplied key
    let matchedIndex = -1;
    for (let i = 0; i < storedKeys.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(recoveryKey.trim(), storedKeys[i]);
      if (ok) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or recovery key'
      });
    }

    // Consume the key + unlock account
    const remainingKeys = storedKeys.filter((_, i) => i !== matchedIndex);

    await prisma.$transaction([
      prisma.admin.update({
        where: { id: user.admin.id },
        data: { recoveryKeys: remainingKeys }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          accountLocked: false,
          accountLockedUntil: null,
          failedLoginAttempts: 0
        }
      })
    ]);

    // Issue a short-lived reset token so the super admin can set a new password
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      success: true,
      message: 'Recovery successful. Set a new password to continue.',
      data: {
        resetToken,
        keysRemaining: remainingKeys.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing recovery',
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
  updateMyEmail,
  uploadProfilePicture,
  removeProfilePicture
};
