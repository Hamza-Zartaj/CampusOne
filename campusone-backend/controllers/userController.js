import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import TA from '../models/TA.js';
import Admin from '../models/Admin.js';
import Course from '../models/Course.js';

/**
 * Get role-specific data based on user role
 */
const getRoleSpecificData = async (userId, role) => {
  let roleData = null;
  
  switch (role) {
    case 'student':
      roleData = await Student.findOne({ userId })
        .populate('enrolledCourses.courseId')
        .populate('completedCourses.courseId');
      break;
    case 'teacher':
      roleData = await Teacher.findOne({ userId })
        .populate('teachingCourses.courseId');
      break;
    case 'ta':
      roleData = await TA.findOne({ userId })
        .populate('studentId')
        .populate('assignedCourses.courseId');
      break;
    case 'admin':
      roleData = await Admin.findOne({ userId });
      break;
  }
  
  return roleData;
};

/**
 * @desc    Get all users with filters and pagination
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 10, search } = req.query;

    // Build query
    const query = {};

    // Filter by role
    if (role) {
      const validRoles = ['student', 'teacher', 'ta', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      query.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await User.countDocuments(query);

    // Get users
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

/**
 * @desc    Get single user by ID with role-specific data
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get role-specific data
    const roleData = await getRoleSpecificData(user._id, user.role);

    res.status(200).json({
      success: true,
      data: {
        user,
        roleData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new user (Admin only)
 * @route   POST /api/users
 * @access  Private/Admin
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, username, ...roleSpecificData } = req.body;

    // Check if trying to create an admin account
    if (role === 'admin') {
      // Only super admins can create admin accounts
      if (!req.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can create admin accounts'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate username if not provided
    const finalUsername = username || email.split('@')[0].toLowerCase();

    // Check if username exists
    const existingUsername = await User.findOne({ username: finalUsername });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Create base user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      username: finalUsername,
      password, // Will be hashed by pre-save hook
      role
    });

    // Create role-specific record
    let roleRecord;
    try {
      switch (role) {
        case 'student': {
          const { studentId, enrollmentYear, department, batch, currentSemester } = roleSpecificData;
          
          // Check if student ID already exists
          const existingStudent = await Student.findOne({ studentId });
          if (existingStudent) {
            throw new Error('Student with this student ID already exists');
          }
          
          roleRecord = await Student.create({
            userId: user._id,
            studentId,
            enrollmentYear,
            department,
            batch,
            currentSemester: currentSemester || 1
          });
          break;
        }

        case 'teacher': {
          const { employeeId: teacherEmpId, department: teacherDept, designation, qualification, specialization } = roleSpecificData;
          
          // Check if employee ID already exists
          const existingTeacher = await Teacher.findOne({ employeeId: teacherEmpId });
          if (existingTeacher) {
            throw new Error('Teacher with this employee ID already exists');
          }
          
          roleRecord = await Teacher.create({
            userId: user._id,
            employeeId: teacherEmpId,
            department: teacherDept,
            designation: designation || 'Lecturer',
            qualification,
            specialization: specialization || []
          });
          break;
        }

        case 'ta': {
          const { studentId } = roleSpecificData;
          
          // Verify student exists
          const student = await Student.findById(studentId);
          if (!student) {
            throw new Error('Student not found for TA assignment');
          }
          
          roleRecord = await TA.create({
            userId: user._id,
            studentId
          });
          break;
        }

        case 'admin': {
          const { employeeId: adminEmpId, department: adminDept, designation: adminDesig, permissions, isSuperAdmin } = roleSpecificData;
          
          // Check if employee ID already exists
          const existingAdmin = await Admin.findOne({ employeeId: adminEmpId });
          if (existingAdmin) {
            throw new Error('Admin with this employee ID already exists');
          }
          
          // Only super admins can create other super admins
          const canCreateSuperAdmin = req.user && req.user.role === 'admin';
          let adminRecordCheck;
          if (canCreateSuperAdmin) {
            adminRecordCheck = await Admin.findOne({ userId: req.user._id });
          }
          
          roleRecord = await Admin.create({
            userId: user._id,
            employeeId: adminEmpId,
            department: adminDept,
            designation: adminDesig || 'Administrator',
            permissions: permissions || ['manage_users', 'manage_courses'],
            isSuperAdmin: adminRecordCheck && adminRecordCheck.isSuperAdmin && isSuperAdmin === true ? true : false
          });
          break;
        }
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
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        },
        roleData: roleRecord
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

/**
 * @desc    Update user information
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, profilePicture, ...roleSpecificData } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update base user fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    // Update role-specific data if provided
    let roleRecord;
    if (Object.keys(roleSpecificData).length > 0) {
      switch (user.role) {
        case 'student':
          roleRecord = await Student.findOneAndUpdate(
            { userId: user._id },
            { $set: roleSpecificData },
            { new: true, runValidators: true }
          );
          break;

        case 'teacher':
          roleRecord = await Teacher.findOneAndUpdate(
            { userId: user._id },
            { $set: roleSpecificData },
            { new: true, runValidators: true }
          );
          break;

        case 'ta':
          roleRecord = await TA.findOneAndUpdate(
            { userId: user._id },
            { $set: roleSpecificData },
            { new: true, runValidators: true }
          );
          break;

        case 'admin':
          roleRecord = await Admin.findOneAndUpdate(
            { userId: user._id },
            { $set: roleSpecificData },
            { new: true, runValidators: true }
          );
          break;
      }
    } else {
      roleRecord = await getRoleSpecificData(user._id, user.role);
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          isActive: user.isActive
        },
        roleData: roleRecord
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

/**
 * @desc    Deactivate user account
 * @route   PUT /api/users/:id/deactivate
 * @access  Private/Admin
 */
export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating user',
      error: error.message
    });
  }
};

/**
 * @desc    Activate user account
 * @route   PUT /api/users/:id/activate
 * @access  Private/Admin
 */
export const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
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
      message: 'User account activated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating user',
      error: error.message
    });
  }
};

/**
 * @desc    Unlock user account (remove lock from failed login attempts)
 * @route   PUT /api/users/:id/unlock
 * @access  Private/Admin
 */
export const unlockAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
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
      message: 'User account unlocked successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountLocked: user.accountLocked
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unlocking account',
      error: error.message
    });
  }
};

/**
 * @desc    Delete user (soft delete - just deactivate)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if trying to delete an admin account
    if (user.role === 'admin') {
      // Only super admins can delete admin accounts
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can delete admin accounts'
        });
      }

      const adminRecord = await Admin.findOne({ userId: req.user._id });
      if (!adminRecord || !adminRecord.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can delete admin accounts'
        });
      }

      // Prevent deletion of super admin accounts
      const targetAdminRecord = await Admin.findOne({ userId: user._id });
      if (targetAdminRecord && targetAdminRecord.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Super Admin accounts cannot be deleted'
        });
      }
    }

    // Soft delete - just deactivate
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

/**
 * @desc    Get user statistics (for admin dashboard)
 * @route   GET /api/users/stats
 * @access  Private/Admin
 */
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const lockedAccounts = await User.countDocuments({ accountLocked: true });

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const roleStats = {};
    usersByRole.forEach(item => {
      roleStats[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        locked: lockedAccounts,
        byRole: roleStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get user statistics by role (Admins, Teachers, Students, TAs)
 * @route   GET /api/users/stats/by-role
 * @access  Private/Admin (with manage_users permission)
 */
export const getUserStatsByRole = async (req, res) => {
  try {
    // Count users by each role
    const [adminCount, teacherCount, studentCount, taCount] = await Promise.all([
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'ta' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        admins: adminCount,
        teachers: teacherCount,
        students: studentCount,
        tas: taCount,
        total: adminCount + teacherCount + studentCount + taCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics by role',
      error: error.message
    });
  }
};

/**
 * @desc    Promote a student to TA role
 * @route   POST /api/users/promote-to-ta
 * @access  Private/Admin (with manage_users permission) or Super Admin
 */
export const promoteStudentToTA = async (req, res) => {
  try {
    const { studentUserId, courseIds } = req.body;

    if (!studentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student user ID'
      });
    }

    // Find the student user
    const studentUser = await User.findById(studentUserId);

    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: 'Student user not found'
      });
    }

    if (studentUser.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student. Only students can be promoted to TA.'
      });
    }

    // Find the student record
    const studentRecord = await Student.findOne({ userId: studentUserId });

    if (!studentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    // Check if already a TA
    const existingTA = await TA.findOne({ userId: studentUserId });

    if (existingTA) {
      return res.status(400).json({
        success: false,
        message: 'Student is already a TA'
      });
    }

    // Update user role to TA
    studentUser.role = 'ta';
    await studentUser.save();

    // Create TA record
    const assignedCourses = [];
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      // Verify courses exist
      const courses = await Course.find({ _id: { $in: courseIds } });
      
      if (courses.length !== courseIds.length) {
        // Rollback user role change
        studentUser.role = 'student';
        await studentUser.save();
        
        return res.status(400).json({
          success: false,
          message: 'One or more course IDs are invalid'
        });
      }

      assignedCourses.push(...courseIds.map(courseId => ({
        courseId,
        responsibilities: ['Grading', 'Tutorial Sessions'],
        hoursPerWeek: 0
      })));
    }

    const taRecord = await TA.create({
      userId: studentUserId,
      studentId: studentRecord._id,
      assignedCourses
    });

    res.status(200).json({
      success: true,
      message: 'Student successfully promoted to TA',
      data: {
        user: {
          id: studentUser._id,
          name: studentUser.name,
          email: studentUser.email,
          role: studentUser.role
        },
        taRecord
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error promoting student to TA',
      error: error.message
    });
  }
};

/**
 * @desc    Search for students by name, email, or student ID
 * @route   GET /api/users/search-students
 * @access  Private/Admin (with manage_users permission)
 */
export const searchStudents = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }

    // Find users with student role matching the query
    const students = await User.find({
      role: 'student',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    }).select('-password').limit(20);

    // Get student records with student IDs
    const studentIds = students.map(s => s._id);
    const studentRecords = await Student.find({ userId: { $in: studentIds } });

    // Combine user and student data
    const studentsWithDetails = students.map(user => {
      const studentRecord = studentRecords.find(sr => sr.userId.toString() === user._id.toString());
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        studentId: studentRecord?.studentId || 'N/A',
        department: studentRecord?.department || 'N/A',
        semester: studentRecord?.currentSemester || 'N/A'
      };
    });

    res.status(200).json({
      success: true,
      count: studentsWithDetails.length,
      data: studentsWithDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching students',
      error: error.message
    });
  }
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  unlockAccount,
  deleteUser,
  getUserStats,
  getUserStatsByRole,
  promoteStudentToTA,
  searchStudents
};
