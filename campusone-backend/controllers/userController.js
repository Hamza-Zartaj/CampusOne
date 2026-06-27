import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import { auditLog } from '../utils/auditLogger.js';

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
 * @desc    Get all users with filters and pagination
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 10, search } = req.query;

    // Build where clause
    const where = {};

    // Filter by role - special handling for TA
    if (role) {
      const validRoles = ['student', 'teacher', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      where.role = role;
    }

    // Filter by active status
    if (isActive === '' || isActive === 'all') {
      // Show all users (no filter)
    } else if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      // By default, only show active users
      where.isActive = true;
    }

    // Search by name or email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let data = [];
    let totalCount = 0;

    // Get total count
      totalCount = await prisma.user.count({ where });

      // Get users
      const users = await prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          profilePicture: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch role-specific data for each user
      data = await Promise.all(users.map(async (user) => {
        const roleData = await getRoleSpecificData(user.id, user.role);
        return {
          ...user,
          roleData: roleData || {}
        };
      }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      count: data.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get role-specific data
    const roleData = await getRoleSpecificData(user.id, user.role);

    res.status(200).json({
      success: true,
      data: {
        ...user,
        roleData: roleData || {}
      }
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
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
      if (!req.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can create admin accounts'
        });
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username || email.split('@')[0].toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'User with this email already exists'
          : 'Username already taken'
      });
    }

    // Generate username if not provided
    const finalUsername = username || email.split('@')[0].toLowerCase();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create base user
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          username: finalUsername,
          password: hashedPassword,
          role
        }
      });

      // Create role-specific record
      let roleRecord;
      try {
        switch (role) {
          case 'student': {
            const { studentId, enrollmentYear, department, batch, currentSemester } = roleSpecificData;
            
            // Check if student ID already exists
            const existingStudent = await tx.student.findUnique({
              where: { studentId }
            });
            if (existingStudent) {
              throw new Error('Student with this student ID already exists');
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
            const { employeeId: teacherEmpId, department: teacherDept, designation, qualification, specialization } = roleSpecificData;
            
            // Check if employee ID already exists
            const existingTeacher = await tx.teacher.findUnique({
              where: { employeeId: teacherEmpId }
            });
            if (existingTeacher) {
              throw new Error('Teacher with this employee ID already exists');
            }
            
            roleRecord = await tx.teacher.create({
              data: {
                userId: user.id,
                employeeId: teacherEmpId,
                department: teacherDept,
                designation: designation || 'Lecturer',
                qualification,
                specialization: specialization || []
              }
            });
            break;
          }

          case 'admin': {
            const { employeeId: adminEmpId, department: adminDept, designation: adminDesig, permissions, isSuperAdmin } = roleSpecificData;
            
            // Check if employee ID already exists
            const existingAdmin = await tx.admin.findUnique({
              where: { employeeId: adminEmpId }
            });
            if (existingAdmin) {
              throw new Error('Admin with this employee ID already exists');
            }
            
            // Only super admins can create other super admins
            let canCreateSuperAdmin = false;
            if (req.user && req.user.role === 'admin') {
              const adminRecord = await tx.admin.findUnique({
                where: { userId: req.user.id }
              });
              canCreateSuperAdmin = adminRecord?.isSuperAdmin || false;
            }
            
            roleRecord = await tx.admin.create({
              data: {
                userId: user.id,
                employeeId: adminEmpId,
                designation: adminDesig || 'Administrator',
                permissions: Array.isArray(permissions) ? permissions : [],
                isSuperAdmin: canCreateSuperAdmin && isSuperAdmin === true
              }
            });
            break;
          }
        }
      } catch (roleError) {
        // Delete the user if role-specific record creation fails
        await tx.user.delete({ where: { id: user.id } });
        throw roleError;
      }

      return { user, roleRecord };
    });

    auditLog({
      action: 'CREATE_USER',
      category: 'USER_MANAGEMENT',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'User',
      targetId: result.user.id,
      description: `Created ${role} account for ${result.user.name} (${result.user.email})`,
      newValue: { name: result.user.name, email: result.user.email, role },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          isActive: result.user.isActive
        },
        roleData: result.roleRecord
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
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
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: id }
        }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Update role-specific data if provided
    let roleRecord;
    if (Object.keys(roleSpecificData).length > 0) {
      switch (user.role) {
        case 'student':
          roleRecord = await prisma.student.update({
            where: { userId: id },
            data: roleSpecificData
          });
          break;

        case 'teacher':
          roleRecord = await prisma.teacher.update({
            where: { userId: id },
            data: roleSpecificData
          });
          break;

        case 'admin':
          roleRecord = await prisma.admin.update({
            where: { userId: id },
            data: roleSpecificData
          });
          break;
      }
    } else {
      roleRecord = await getRoleSpecificData(id, user.role);
    }

    auditLog({
      action: 'UPDATE_USER',
      category: 'USER_MANAGEMENT',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'User',
      targetId: id,
      description: `Updated ${user.role} account for ${updatedUser.name} (${updatedUser.email})`,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser,
        roleData: roleRecord
      }
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
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
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    auditLog({
      action: 'DEACTIVATE_USER',
      category: 'USER_MANAGEMENT',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'User',
      targetId: id,
      description: `Deactivated account for ${user.name} (${user.email})`,
    });

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error deactivating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
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

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    auditLog({
      action: 'ACTIVATE_USER',
      category: 'USER_MANAGEMENT',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'User',
      targetId: id,
      description: `Activated account for ${user.name} (${user.email})`,
    });

    res.status(200).json({
      success: true,
      message: 'User account activated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error activating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
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

    const user = await prisma.user.update({
      where: { id },
      data: {
        accountLocked: false,
        accountLockedUntil: null,
        failedLoginAttempts: 0
      },
      select: {
        id: true,
        name: true,
        email: true,
        accountLocked: true
      }
    });

    auditLog({
      action: 'UNLOCK_ACCOUNT',
      category: 'USER_MANAGEMENT',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'User',
      targetId: id,
      description: `Unlocked account for ${user.name} (${user.email})`,
    });

    res.status(200).json({
      success: true,
      message: 'User account unlocked successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error unlocking account:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({
      success: false,
      message: 'Error unlocking account',
      error: error.message
    });
  }
};

/**
 * @desc    Delete user (hard delete)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if trying to delete an admin account
    if (user.role === 'admin') {
      const adminRecord = await prisma.admin.findUnique({
        where: { userId: req.user.id }
      });
      
      if (!adminRecord?.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can delete admin accounts'
        });
      }

      // Prevent deletion of super admin accounts
      const targetAdminRecord = await prisma.admin.findUnique({
        where: { userId: id }
      });
      if (targetAdminRecord?.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Super Admin accounts cannot be deleted'
        });
      }
    }

    // Use transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Delete role-specific records
      if (user.role === 'student') {
        await tx.student.delete({ where: { userId: id } });
      } else if (user.role === 'teacher') {
        await tx.teacher.delete({ where: { userId: id } });
      } else if (user.role === 'admin') {
        await tx.admin.delete({ where: { userId: id } });
      }

      // Delete the user
      await tx.user.delete({ where: { id } });
    });

    auditLog({
      action: 'DELETE_USER',
      category: 'USER_MANAGEMENT',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'User',
      targetId: id,
      description: `Permanently deleted ${user.role} account for ${user.name} (${user.email})`,
      previousValue: { name: user.name, email: user.email, role: user.role },
    });

    res.status(200).json({
      success: true,
      message: 'User permanently deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
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
    const [totalUsers, activeUsers, inactiveUsers, lockedAccounts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { accountLocked: true } })
    ]);

    // Get count by role
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    const byRole = {};
    roleStats.forEach(stat => {
      byRole[stat.role] = stat._count;
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        locked: lockedAccounts,
        byRole
      }
    });
  } catch (error) {
    logger.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get user statistics by role
 * @route   GET /api/users/stats/by-role
 * @access  Private/Admin
 */
export const getUserStatsByRole = async (req, res) => {
  try {
    const [adminCount, teacherCount, studentCount] = await Promise.all([
      prisma.user.count({ where: { role: 'admin', isActive: true } }),
      prisma.user.count({ where: { role: 'teacher', isActive: true } }),
      prisma.user.count({ where: { role: 'student', isActive: true } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        admins: adminCount,
        teachers: teacherCount,
        students: studentCount,
        total: adminCount + teacherCount + studentCount
      }
    });
  } catch (error) {
    logger.error('Error fetching user statistics by role:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics by role',
      error: error.message
    });
  }
};

/**
 * @desc    Search for students by name, email, or student ID
 * @route   GET /api/users/search-students
 * @access  Private/Admin
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
    const students = await prisma.user.findMany({
      where: {
        role: 'student',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true
      },
      take: 20
    });

    // Get student records with student IDs
    const studentIds = students.map(s => s.id);
    const studentRecords = await prisma.student.findMany({
      where: { userId: { in: studentIds } },
      select: {
        userId: true,
        studentId: true,
        department: true,
        currentSemester: true
      }
    });

    // Combine user and student data
    const studentsWithDetails = students.map(user => {
      const studentRecord = studentRecords.find(sr => sr.userId === user.id);
      return {
        userId: user.id,
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
    logger.error('Error searching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching students',
      error: error.message
    });
  }
};

/**
 * @desc    Download Excel template for bulk student upload
 * @route   GET /api/users/bulk-upload/template
 * @access  Private/Admin
 */
export const downloadBulkUploadTemplate = async (req, res) => {
  try {
    // Create workbook
    const wb = xlsx.utils.book_new();
    
    // Define template headers and sample data
    const templateData = [
      {
        'Full Name': 'John Doe',
        'Email': 'john.doe@example.com',
        'Student ID': '2024-CS-001',
        'Password': 'password123',
        'Department': 'Computer Science',
        'Enrollment Year': 2024,
        'Batch': '2024',
        'Current Semester': 1
      },
      {
        'Full Name': 'Jane Smith',
        'Email': 'jane.smith@example.com',
        'Student ID': '2024-CS-002',
        'Password': 'password123',
        'Department': 'Computer Science',
        'Enrollment Year': 2024,
        'Batch': '2024',
        'Current Semester': 1
      }
    ];
    
    // Create worksheet
    const ws = xlsx.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { wch: 17 }
    ];
    
    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Students');
    
    // Generate buffer
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_bulk_upload_template.xlsx');
    
    res.send(excelBuffer);
  } catch (error) {
    logger.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk upload students from Excel file
 * @route   POST /api/users/bulk-upload
 * @access  Private/Admin
 */
export const bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Read the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = {
      total: data.length,
      successful: [],
      failed: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Validate required fields
        const requiredFields = ['Full Name', 'Email', 'Student ID', 'Password', 'Department', 'Enrollment Year', 'Current Semester'];
        const missingFields = requiredFields.filter(field => !row[field]);
        
        if (missingFields.length > 0) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row['Email'])) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Invalid email format'
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: row['Email'].toLowerCase() },
              { username: row['Email'].split('@')[0].toLowerCase() }
            ]
          }
        });

        if (existingUser) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'User with this email or username already exists'
          });
          continue;
        }

        // Check if student ID already exists
        const existingStudent = await prisma.student.findUnique({
          where: { studentId: row['Student ID'] }
        });

        if (existingStudent) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Student with this ID already exists'
          });
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(row['Password'], 10);

        // Create user and student in transaction
        const username = row['Email'].split('@')[0].toLowerCase();
        
        await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: row['Full Name'],
              email: row['Email'].toLowerCase(),
              username,
              password: hashedPassword,
              role: 'student'
            }
          });

          await tx.student.create({
            data: {
              userId: newUser.id,
              studentId: row['Student ID'],
              enrollmentYear: parseInt(row['Enrollment Year']),
              department: row['Department'],
              batch: row['Batch'] || row['Enrollment Year'].toString(),
              currentSemester: parseInt(row['Current Semester'])
            }
          });
        });

        results.successful.push({
          row: rowNumber,
          email: row['Email'],
          message: 'Student created successfully'
        });
      } catch (error) {
        results.failed.push({
          row: rowNumber,
          data: row,
          error: error.message
        });
      }
    }

    auditLog({
      action: 'BULK_UPLOAD_STUDENTS',
      category: 'USER_MANAGEMENT',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'Student',
      targetId: 'bulk',
      description: `Bulk uploaded students: ${results.successful.length} created, ${results.failed.length} failed out of ${results.total} rows`,
      newValue: { total: results.total, successful: results.successful.length, failed: results.failed.length },
    });

    res.status(200).json({
      success: true,
      message: `Bulk upload completed. ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    logger.error('Error bulk uploading students:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk uploading students',
      error: error.message
    });
  }
};
