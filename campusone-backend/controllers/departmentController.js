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
    const departments = await Department.find(query)
      .setOptions(queryOptions)
      .populate('headOfDepartment', 'userId employeeId designation')
      .sort({ departmentCode: 1 })
      .skip(skip)
      .limit(limitNum);

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
      .populate('headOfDepartment', 'userId employeeId designation');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (error) {
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
      departmentCode,
      name,
      description,
      headOfDepartment,
      contactEmail,
      contactPhone,
      location
    } = req.body;

    // Check if department code already exists
    const existingDepartment = await Department.findOne({ departmentCode: departmentCode.toUpperCase() })
      .setOptions({ includeSoftDeleted: true });
    
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Department with this code already exists'
      });
    }

    const department = await Department.create({
      departmentCode,
      name,
      description,
      headOfDepartment,
      contactEmail,
      contactPhone,
      location
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
      departmentCode,
      name,
      description,
      headOfDepartment,
      contactEmail,
      contactPhone,
      location,
      isActive
    } = req.body;

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if updating to a code that already exists
    if (departmentCode && departmentCode.toUpperCase() !== department.departmentCode) {
      const existingDepartment = await Department.findOne({ 
        departmentCode: departmentCode.toUpperCase(),
        _id: { $ne: id }
      }).setOptions({ includeSoftDeleted: true });
      
      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: 'Department with this code already exists'
        });
      }
    }

    // Update fields
    if (departmentCode) department.departmentCode = departmentCode;
    if (name) department.name = name;
    if (description !== undefined) department.description = description;
    if (headOfDepartment !== undefined) department.headOfDepartment = headOfDepartment || null;
    if (contactEmail !== undefined) department.contactEmail = contactEmail;
    if (contactPhone !== undefined) department.contactPhone = contactPhone;
    if (location !== undefined) department.location = location;
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
