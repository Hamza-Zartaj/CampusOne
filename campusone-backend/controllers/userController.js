import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import TA from '../models/TA.js';
import Admin from '../models/Admin.js';

// Get role-specific model
const getRoleModel = (role) => {
  const models = {
    student: Student,
    teacher: Teacher,
    ta: TA,
    admin: Admin
  };
  return models[role];
};

// Get role-specific data
const getRoleData = async (userId, role) => {
  const Model = getRoleModel(role);
  if (!Model) return null;
  
  let query = Model.findOne({ userId });
  
  // Add population based on role
  if (role === 'student') {
    query = query.populate('enrolledCourses.courseId completedCourses.courseId');
  } else if (role === 'teacher') {
    query = query.populate('teachingCourses');
  } else if (role === 'ta') {
    query = query.populate('assignedCourses');
  }
  
  return await query;
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;

    // Build query
    const query = {};
    
    if (role) {
      const validRoles = ['student', 'teacher', 'ta', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role filter'
        });
      }
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get users with pagination
    const users = await User.find(query)
      .select('-password -twoFactorSecret')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -twoFactorSecret');

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
        ...user.toObject(),
        roleData
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
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
      officeHours,
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
        officeHours: officeHours || undefined
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

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...user.toObject(),
        roleData: roleRecord
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      profilePicture,
      // Don't allow password update here (use separate route)
      // Role-specific fields
      ...roleSpecificFields
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    // Update role-specific data if provided
    if (Object.keys(roleSpecificFields).length > 0) {
      const Model = getRoleModel(user.role);
      if (Model) {
        await Model.findOneAndUpdate(
          { userId: user._id },
          { $set: roleSpecificFields },
          { new: true, runValidators: true }
        );
      }
    }

    // Get updated role data
    const roleData = await getRoleData(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        roleData
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc    Deactivate user account
// @route   PUT /api/users/:id/deactivate
// @access  Private/Admin
export const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating user',
      error: error.message
    });
  }
};

// @desc    Activate user account
// @route   PUT /api/users/:id/activate
// @access  Private/Admin
export const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating user',
      error: error.message
    });
  }
};

// @desc    Unlock user account
// @route   PUT /api/users/:id/unlock
// @access  Private/Admin
export const unlockAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.accountLocked = false;
    user.accountLockedUntil = null;
    user.failedLoginAttempts = 0;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account unlocked successfully'
    });
  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking account',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete role-specific record
    const Model = getRoleModel(user.role);
    if (Model) {
      await Model.findOneAndDelete({ userId: user._id });
    }

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};
