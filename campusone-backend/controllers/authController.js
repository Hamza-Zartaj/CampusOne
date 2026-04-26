import prisma from '../prisma/client.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { generateOTP, sendOTPEmail, send2FAEnabledEmail } from '../services/emailService.js';

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
        where: { userId },
        include: {
          enrollments: {
            include: { courseOffering: { include: { course: true } } }
          }
        }
      });
      break;
    case 'teacher':
      roleData = await prisma.teacher.findUnique({
        where: { userId },
        include: {
          courseOfferings: {
            include: { course: true }
          }
        }
      });
      break;
    case 'ta':
      roleData = await prisma.ta.findUnique({
        where: { userId },
        include: {
          student: true,
          teacher: true
        }
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
    const validRoles = ['student', 'teacher', 'ta', 'admin'];
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
      case 'ta':
        if (!roleSpecificData.studentId) {
          return res.status(400).json({
            success: false,
            message: 'Please provide studentId for TA (TA must be a student)'
          });
        }
        const studentRecord = await prisma.student.findUnique({
          where: { id: roleSpecificData.studentId }
        });
        if (!studentRecord) {
          return res.status(400).json({
            success: false,
            message: 'Student record not found for TA'
          });
        }
        username = studentRecord.studentId.toLowerCase();
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

          case 'ta': {
            const { studentId } = roleSpecificData;
            if (!studentId) {
              throw new Error('Please provide studentId for TA (TA must be a student)');
            }
            roleRecord = await tx.ta.create({
              data: {
                userId: user.id,
                studentId
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

    const trustedDevice = user.trustedDevices?.find(d => d.deviceId === deviceId);
    const isTrusted = !!trustedDevice;

    // Check if 2FA is enabled and device is not trusted
    if (user.twoFactorEnabled && !isTrusted) {
      if (user.twoFactorMethod === 'email') {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailOTP: {
              code: otp,
              expiresAt,
              attempts: 0
            }
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
      const devices = user.trustedDevices || [];
      devices.push({
        deviceId,
        deviceName: deviceFingerprint.deviceName,
        ipAddress: deviceFingerprint.ipAddress,
        lastUsed: new Date()
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { trustedDevices: devices }
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
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        trustedDevices: rememberDevice
          ? Array.from(new Set([...(user.trustedDevices || []).map(d => JSON.stringify(d)), JSON.stringify({
              deviceId,
              deviceName: deviceFingerprint.deviceName,
              ipAddress: deviceFingerprint.ipAddress,
              lastUsed: new Date()
            })]))
              .map(d => JSON.parse(d))
          : user.trustedDevices
      }
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

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
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

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide password and 2FA token'
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

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        trustedDevices: []
      }
    });

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
        trustedDevices: user.trustedDevices || []
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

    const filteredDevices = (user.trustedDevices || []).filter(d => d.deviceId !== deviceId);

    await prisma.user.update({
      where: { id: user.id },
      data: { trustedDevices: filteredDevices }
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
        trustedDevices: user.trustedDevices,
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
            emailOTP: {
              code: otp,
              expiresAt,
              attempts: 0
            }
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
        emailOTP: {
          code: otp,
          expiresAt,
          attempts: 0
        }
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

    if (!user.emailOTP || !user.emailOTP.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
    }

    if ((user.emailOTP.attempts || 0) >= 5) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailOTP: {
            code: null,
            expiresAt: null,
            attempts: 0
          }
        }
      });
      
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    if (new Date() > user.emailOTP.expiresAt) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailOTP: {
            code: null,
            expiresAt: null,
            attempts: 0
          }
        }
      });

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.emailOTP.code !== otp) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailOTP: {
            ...user.emailOTP,
            attempts: (user.emailOTP.attempts || 0) + 1
          }
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code',
        attemptsRemaining: 5 - ((user.emailOTP.attempts || 0) + 1)
      });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: 'email',
        emailOTP: {
          code: null,
          expiresAt: null,
          attempts: 0
        },
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
        emailOTP: {
          code: otp,
          expiresAt,
          attempts: 0
        }
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

    if (!user.emailOTP || !user.emailOTP.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
    }

    if ((user.emailOTP.attempts || 0) >= 5) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailOTP: {
            code: null,
            expiresAt: null,
            attempts: 0
          }
        }
      });
      
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    if (new Date() > user.emailOTP.expiresAt) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailOTP: {
            code: null,
            expiresAt: null,
            attempts: 0
          }
        }
      });

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.emailOTP.code !== otp) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailOTP: {
            ...user.emailOTP,
            attempts: (user.emailOTP.attempts || 0) + 1
          }
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code',
        attemptsRemaining: 5 - ((user.emailOTP.attempts || 0) + 1)
      });
    }

    // Clear OTP and add device to trusted devices if requested
    const deviceFingerprint = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceName: extractDeviceName(req.headers['user-agent'])
    };

    const deviceId = generateDeviceId(deviceFingerprint);
    const devices = user.trustedDevices || [];

    if (rememberDevice) {
      const trustedDevice = devices.find(d => d.deviceId === deviceId);
      if (!trustedDevice) {
        devices.push({
          deviceId,
          deviceName: deviceFingerprint.deviceName,
          ipAddress: deviceFingerprint.ipAddress,
          lastUsed: new Date()
        });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailOTP: {
          code: null,
          expiresAt: null,
          attempts: 0
        },
        trustedDevices: devices
      }
    });

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
 * @desc    Request password reset - sends OTP based on user's 2FA method
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

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Please contact administrator to reset your password'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOTP: {
          code: otp,
          expiresAt,
          attempts: 0
        }
      }
    });

    if (user.twoFactorMethod === 'email') {
      await sendOTPEmail(user.email, user.name, otp);
      
      return res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
        data: {
          userId: user.id,
          method: 'email',
          email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Please enter the code from your authenticator app',
        data: {
          userId: user.id,
          method: 'authenticator'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request',
      error: error.message
    });
  }
};

/**
 * @desc    Verify 2FA code for password reset
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

    // Verify based on method
    if (user.twoFactorMethod === 'email') {
      if (!user.emailOTP || !user.emailOTP.code) {
        return res.status(400).json({
          success: false,
          message: 'No verification code found. Please request a new one.'
        });
      }

      if ((user.emailOTP.attempts || 0) >= 5) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            emailOTP: {
              code: null,
              expiresAt: null,
              attempts: 0
            }
          }
        });
        
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please request a new code.'
        });
      }

      if (new Date() > user.emailOTP.expiresAt) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            emailOTP: {
              code: null,
              expiresAt: null,
              attempts: 0
            }
          }
        });

        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        });
      }

      if (user.emailOTP.code !== code) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            emailOTP: {
              ...user.emailOTP,
              attempts: (user.emailOTP.attempts || 0) + 1
            }
          }
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
          attemptsRemaining: 5 - ((user.emailOTP.attempts || 0) + 1)
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

    // Clear OTP if email method
    if (user.twoFactorMethod === 'email') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailOTP: {
            code: null,
            expiresAt: null,
            attempts: 0
          }
        }
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
  resetPassword
};
