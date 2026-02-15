import Department from '../models/Department.js';

/**
 * @desc    Get all departments with pagination and search
 * @route   GET /api/departments
 * @access  Private/Admin
 */
export const getAllDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive, includeSoftDeleted } = req.query;

    // Build query
    const query = {};

    // Filter by active status
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    // Search by name or code
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { departmentCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query options
    const queryOptions = includeSoftDeleted === 'true' ? { includeSoftDeleted: true } : {};

    // Get total count
    const total = await Department.countDocuments(query).setOptions(queryOptions);

    // Get departments
    let departments = await Department.find(query)
      .setOptions(queryOptions)
      .populate({
        path: 'headOfDepartment',
        select: 'userId employeeId designation',
        populate: {
          path: 'userId',
          select: 'name email username'
        },
        strictPopulate: false
      })
      .sort({ departmentCode: 1 })
      .skip(skip)
      .limit(limitNum);

    // Transform HOD to flatten user info for easier frontend access
    departments = departments.map(dept => {
      const deptObj = dept.toObject ? dept.toObject() : dept;
      if (deptObj.headOfDepartment && deptObj.headOfDepartment.userId) {
        deptObj.headOfDepartment = {
          _id: deptObj.headOfDepartment._id,
          userId: deptObj.headOfDepartment.userId._id,
          employeeId: deptObj.headOfDepartment.employeeId,
          designation: deptObj.headOfDepartment.designation,
          name: deptObj.headOfDepartment.userId.name,
          email: deptObj.headOfDepartment.userId.email,
          username: deptObj.headOfDepartment.userId.username
        };
      }
      return deptObj;
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: departments.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data: departments
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

    const department = await Department.findById(id)
      .populate({
        path: 'headOfDepartment',
        select: 'userId employeeId designation',
        populate: {
          path: 'userId',
          select: 'name email username'
        },
        strictPopulate: false
      });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Transform HOD to flatten user info for easier frontend access
    let deptData = department.toObject ? department.toObject() : department;
    if (deptData.headOfDepartment && deptData.headOfDepartment.userId) {
      deptData.headOfDepartment = {
        _id: deptData.headOfDepartment._id,
        userId: deptData.headOfDepartment.userId._id,
        employeeId: deptData.headOfDepartment.employeeId,
        designation: deptData.headOfDepartment.designation,
        name: deptData.headOfDepartment.userId.name,
        email: deptData.headOfDepartment.userId.email,
        username: deptData.headOfDepartment.userId.username
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
    let existingCount = await Department.countDocuments({ departmentCode: uniqueCode })
      .setOptions({ includeSoftDeleted: true });
    
    while (existingCount > 0) {
      uniqueCode = code + counter;
      counter++;
      existingCount = await Department.countDocuments({ departmentCode: uniqueCode })
        .setOptions({ includeSoftDeleted: true });
    }

    const department = await Department.create({
      departmentCode: uniqueCode,
      name: name.trim(),
      description: description ? description.trim() : undefined,
      headOfDepartment: headOfDepartment || undefined
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

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Update fields
    if (name && name.trim()) department.name = name.trim();
    if (description !== undefined) department.description = description ? description.trim() : '';
    if (headOfDepartment !== undefined) department.headOfDepartment = headOfDepartment || null;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
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

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await department.softDelete(req.user._id);

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

    const department = await Department.findById(id).setOptions({ includeSoftDeleted: true });

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

    await department.restore();

    res.status(200).json({
      success: true,
      message: 'Department restored successfully',
      data: department
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
 * @desc    Permanently delete department
 * @route   DELETE /api/departments/:id/permanent
 * @access  Private/Super Admin
 */
export const permanentDeleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id).setOptions({ includeSoftDeleted: true });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await Department.findByIdAndDelete(id);

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
