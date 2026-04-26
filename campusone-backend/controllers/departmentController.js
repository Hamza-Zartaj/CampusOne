import prisma from '../prisma/client.js';

/**
 * @desc    Get all departments with pagination and search
 * @route   GET /api/departments
 * @access  Private/Admin
 */
export const getAllDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive, includeSoftDeleted } = req.query;

    // Build where clause
    const where = {};

    // Filter by active status
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    // Search by name, code, or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { departmentCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Handle soft deletes
    if (includeSoftDeleted !== 'true') {
      where.isDeleted = false;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.department.count({ where });

    // Get departments with HOD details
    const departments = await prisma.department.findMany({
      where,
      include: {
        headOfDepartment: {
          include: {
            userId: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: { departmentCode: 'asc' },
      skip,
      take: limitNum
    });

    // Transform HOD to flatten user info for easier frontend access
    const transformedDepartments = departments.map(dept => {
      if (dept.headOfDepartment && dept.headOfDepartment.userId) {
        return {
          ...dept,
          headOfDepartment: {
            id: dept.headOfDepartment.id,
            userId: dept.headOfDepartment.userId.id,
            employeeId: dept.headOfDepartment.employeeId,
            designation: dept.headOfDepartment.designation,
            name: dept.headOfDepartment.userId.name,
            email: dept.headOfDepartment.userId.email,
            username: dept.headOfDepartment.userId.username
          }
        };
      }
      return dept;
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: transformedDepartments.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data: transformedDepartments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching departments',
      error: error.message
    });
  }
};

/**
 * @desc    Get single department by ID
 * @route   GET /api/departments/:id
 * @access  Private/Admin
 */
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        headOfDepartment: {
          include: {
            userId: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Transform HOD to flatten user info
    let deptData = department;
    if (deptData.headOfDepartment && deptData.headOfDepartment.userId) {
      deptData = {
        ...deptData,
        headOfDepartment: {
          id: deptData.headOfDepartment.id,
          userId: deptData.headOfDepartment.userId.id,
          employeeId: deptData.headOfDepartment.employeeId,
          designation: deptData.headOfDepartment.designation,
          name: deptData.headOfDepartment.userId.name,
          email: deptData.headOfDepartment.userId.email,
          username: deptData.headOfDepartment.userId.username
        }
      };
    }

    res.status(200).json({
      success: true,
      data: deptData
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department',
      error: error.message
    });
  }
};

/**
 * @desc    Create new department
 * @route   POST /api/departments
 * @access  Private/Admin
 */
export const createDepartment = async (req, res) => {
  try {
    const {
      name,
      description,
      headOfDepartment
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    // Generate department code from name
    const words = name.trim().split(/\s+/);
    let code = words.map(word => word.substring(0, 1).toUpperCase()).join('').substring(0, 10);
    
    // Ensure code is unique by appending counter if needed
    let uniqueCode = code;
    let counter = 1;
    let existingCount = await prisma.department.count({
      where: { departmentCode: uniqueCode }
    });
    
    while (existingCount > 0) {
      uniqueCode = code + counter;
      counter++;
      existingCount = await prisma.department.count({
        where: { departmentCode: uniqueCode }
      });
    }

    const department = await prisma.department.create({
      data: {
        departmentCode: uniqueCode,
        name: name.trim(),
        description: description ? description.trim() : undefined,
        headOfDepartment: headOfDepartment || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating department',
      error: error.message
    });
  }
};

/**
 * @desc    Update department
 * @route   PUT /api/departments/:id
 * @access  Private/Admin
 */
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      headOfDepartment,
      isActive
    } = req.body;

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Build update data
    const updateData = {};
    
    if (name && name.trim()) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : '';
    if (headOfDepartment !== undefined) updateData.headOfDepartment = headOfDepartment || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.department.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating department',
      error: error.message
    });
  }
};

/**
 * @desc    Delete department (soft delete)
 * @route   DELETE /api/departments/:id
 * @access  Private/Admin
 */
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Soft delete
    await prisma.department.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user?.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting department',
      error: error.message
    });
  }
};

/**
 * @desc    Restore soft-deleted department
 * @route   POST /api/departments/:id/restore
 * @access  Private/Admin
 */
export const restoreDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Find including soft-deleted records
    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    if (!department.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Department is not deleted'
      });
    }

    const restored = await prisma.department.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Department restored successfully',
      data: restored
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error restoring department',
      error: error.message
    });
  }
};

/**
 * @desc    Permanently delete department (hard delete)
 * @route   DELETE /api/departments/:id/permanent
 * @access  Private/SuperAdmin
 */
export const permanentDeleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Permanently delete from database
    await prisma.department.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Department permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting department',
      error: error.message
    });
  }
};

export default {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
  permanentDeleteDepartment
};
