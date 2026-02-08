import Program from '../models/Program.js';

/**
 * @desc    Get all programs with pagination and search
 * @route   GET /api/programs
 * @access  Private/Admin
 */
export const getAllPrograms = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, type, isActive, includeSoftDeleted } = req.query;

    // Build query
    const query = {};

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Filter by program type
    if (type) {
      query.type = type;
    }

    // Filter by active status
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    // Search by name or code
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { programCode: { $regex: search, $options: 'i' } },
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
    const total = await Program.countDocuments(query).setOptions(queryOptions);

    // Get programs
    const programs = await Program.find(query)
      .setOptions(queryOptions)
      .populate('department', 'departmentCode name')
      .sort({ programCode: 1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: programs.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data: programs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching programs',
      error: error.message
    });
  }
};

/**
 * @desc    Get single program by ID
 * @route   GET /api/programs/:id
 * @access  Private/Admin
 */
export const getProgramById = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id)
      .populate('department', 'departmentCode name');

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.status(200).json({
      success: true,
      data: program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching program',
      error: error.message
    });
  }
};

/**
 * @desc    Get programs by department
 * @route   GET /api/programs/department/:departmentId
 * @access  Private
 */
export const getProgramsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { isActive } = req.query;

    const query = { department: departmentId };
    
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    const programs = await Program.find(query)
      .populate('department', 'departmentCode name')
      .sort({ programCode: 1 });

    res.status(200).json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching programs',
      error: error.message
    });
  }
};

/**
 * @desc    Create new program
 * @route   POST /api/programs
 * @access  Private/Admin
 */
export const createProgram = async (req, res) => {
  try {
    const {
      programCode,
      name,
      description,
      department,
      type,
      durationYears,
      totalSemesters,
      totalCredits,
      eligibilityCriteria
    } = req.body;

    // Check if program code already exists
    const existingProgram = await Program.findOne({ programCode: programCode.toUpperCase() })
      .setOptions({ includeSoftDeleted: true });
    
    if (existingProgram) {
      return res.status(400).json({
        success: false,
        message: 'Program with this code already exists'
      });
    }

    const program = await Program.create({
      programCode,
      name,
      description,
      department,
      type,
      durationYears,
      totalSemesters,
      totalCredits,
      eligibilityCriteria
    });

    // Populate department before returning
    await program.populate('department', 'departmentCode name');

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating program',
      error: error.message
    });
  }
};

/**
 * @desc    Update program
 * @route   PUT /api/programs/:id
 * @access  Private/Admin
 */
export const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      programCode,
      name,
      description,
      department,
      type,
      durationYears,
      totalSemesters,
      totalCredits,
      eligibilityCriteria,
      isActive
    } = req.body;

    const program = await Program.findById(id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Check if updating to a code that already exists
    if (programCode && programCode.toUpperCase() !== program.programCode) {
      const existingProgram = await Program.findOne({ 
        programCode: programCode.toUpperCase(),
        _id: { $ne: id }
      }).setOptions({ includeSoftDeleted: true });
      
      if (existingProgram) {
        return res.status(400).json({
          success: false,
          message: 'Program with this code already exists'
        });
      }
    }

    // Update fields
    if (programCode) program.programCode = programCode;
    if (name) program.name = name;
    if (description !== undefined) program.description = description;
    if (department) program.department = department;
    if (type) program.type = type;
    if (durationYears) program.durationYears = durationYears;
    if (totalSemesters) program.totalSemesters = totalSemesters;
    if (totalCredits) program.totalCredits = totalCredits;
    if (eligibilityCriteria !== undefined) program.eligibilityCriteria = eligibilityCriteria;
    if (isActive !== undefined) program.isActive = isActive;

    await program.save();

    // Populate department before returning
    await program.populate('department', 'departmentCode name');

    res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      data: program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating program',
      error: error.message
    });
  }
};

/**
 * @desc    Delete program (soft delete)
 * @route   DELETE /api/programs/:id
 * @access  Private/Admin
 */
export const deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    await program.softDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Program deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting program',
      error: error.message
    });
  }
};

/**
 * @desc    Restore soft-deleted program
 * @route   POST /api/programs/:id/restore
 * @access  Private/Admin
 */
export const restoreProgram = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id).setOptions({ includeSoftDeleted: true });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    if (!program.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Program is not deleted'
      });
    }

    await program.restore();

    // Populate department before returning
    await program.populate('department', 'departmentCode name');

    res.status(200).json({
      success: true,
      message: 'Program restored successfully',
      data: program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error restoring program',
      error: error.message
    });
  }
};

/**
 * @desc    Permanently delete program
 * @route   DELETE /api/programs/:id/permanent
 * @access  Private/Super Admin
 */
export const permanentDeleteProgram = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id).setOptions({ includeSoftDeleted: true });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    await Program.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Program permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting program',
      error: error.message
    });
  }
};
