import SemesterIncharge from '../models/SemesterIncharge.js';
import Teacher from '../models/Teacher.js';
import Program from '../models/Program.js';
import Department from '../models/Department.js';
import AuditLogger from '../services/auditLogger.js';

/**
 * @desc    Get all semester incharges with pagination and filters
 * @route   GET /api/semester-incharges
 * @access  Private/Admin
 */
export const getAllSemesterIncharges = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      teacher,
      program,
      department,
      batch,
      academicYear,
      semesterNumber,
      status,
      includeSoftDeleted
    } = req.query;

    // Build query
    const query = {};

    if (teacher) query.teacher = teacher;
    if (program) query.program = program;
    if (department) query.department = department;
    if (batch) query.batch = batch;
    if (academicYear) query.academicYear = academicYear;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber);
    if (status) query.status = status;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query options
    const queryOptions = includeSoftDeleted === 'true' ? { includeSoftDeleted: true } : {};

    // Get total count
    const total = await SemesterIncharge.countDocuments(query).setOptions(queryOptions);

    // Get semester incharges
    const incharges = await SemesterIncharge.find(query)
      .setOptions(queryOptions)
      .populate({
        path: 'teacher',
        select: 'employeeId designation userId department',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('program', 'programCode name')
      .populate('department', 'departmentCode name')
      .populate('appointedBy', 'name email')
      .sort({ academicYear: -1, semesterNumber: 1, batch: 1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: incharges.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data: incharges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching semester incharges',
      error: error.message
    });
  }
};

/**
 * @desc    Get semester incharge by ID
 * @route   GET /api/semester-incharges/:id
 * @access  Private
 */
export const getSemesterInchargeById = async (req, res) => {
  try {
    const { id } = req.params;

    const incharge = await SemesterIncharge.findById(id)
      .populate({
        path: 'teacher',
        select: 'employeeId designation userId department officeRoom',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('program', 'programCode name totalSemesters')
      .populate('department', 'departmentCode name')
      .populate('appointedBy', 'name email');

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'Semester incharge not found'
      });
    }

    res.status(200).json({
      success: true,
      data: incharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching semester incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Get incharge for a specific program + batch + academicYear + semester
 * @route   GET /api/semester-incharges/lookup
 * @access  Private
 */
export const lookupIncharge = async (req, res) => {
  try {
    const { program, batch, academicYear, semesterNumber } = req.query;

    if (!program || !batch || !academicYear || !semesterNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide program, batch, academicYear, and semesterNumber'
      });
    }

    const incharge = await SemesterIncharge.findOne({
      program,
      batch,
      academicYear,
      semesterNumber: parseInt(semesterNumber),
      status: 'active'
    })
      .populate({
        path: 'teacher',
        select: 'employeeId designation userId department officeRoom officeHours',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('program', 'programCode name')
      .populate('department', 'departmentCode name');

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'No active incharge found for this combination'
      });
    }

    res.status(200).json({
      success: true,
      data: incharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error looking up incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Get all incharges for a teacher
 * @route   GET /api/semester-incharges/teacher/:teacherId
 * @access  Private
 */
export const getInchargesByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status, academicYear } = req.query;

    const query = { teacher: teacherId };
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;

    const incharges = await SemesterIncharge.find(query)
      .populate('program', 'programCode name')
      .populate('department', 'departmentCode name')
      .sort({ academicYear: -1, semesterNumber: 1 });

    res.status(200).json({
      success: true,
      count: incharges.length,
      data: incharges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher incharges',
      error: error.message
    });
  }
};

/**
 * @desc    Assign semester incharge
 * @route   POST /api/semester-incharges
 * @access  Private/Admin
 */
export const assignSemesterIncharge = async (req, res) => {
  try {
    const {
      teacher,
      program,
      department,
      batch,
      academicYear,
      semesterNumber,
      responsibilities,
      startDate,
      endDate,
      remarks
    } = req.body;

    // Validate teacher exists
    const teacherDoc = await Teacher.findById(teacher);
    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Validate program exists
    const programDoc = await Program.findById(program);
    if (!programDoc) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Validate semester number
    if (semesterNumber > programDoc.totalSemesters) {
      return res.status(400).json({
        success: false,
        message: `Invalid semester number. Program has ${programDoc.totalSemesters} semesters`
      });
    }

    // Validate department if provided
    if (department) {
      const departmentDoc = await Department.findById(department);
      if (!departmentDoc) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
    }

    // Check if there's already an active incharge for this combination
    const existingIncharge = await SemesterIncharge.findOne({
      program,
      batch,
      academicYear,
      semesterNumber,
      status: 'active'
    });

    if (existingIncharge) {
      return res.status(400).json({
        success: false,
        message: 'An active incharge already exists for this program, batch, academic year, and semester. Use replace endpoint to change.',
        existingIncharge: existingIncharge._id
      });
    }

    const incharge = await SemesterIncharge.create({
      teacher,
      program,
      department: department || programDoc.department,
      batch,
      academicYear,
      semesterNumber,
      responsibilities: responsibilities || [],
      startDate,
      endDate,
      remarks,
      appointedBy: req.user._id,
      appointedAt: new Date()
    });

    // Populate and return
    await incharge.populate([
      {
        path: 'teacher',
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      },
      { path: 'program', select: 'programCode name' },
      { path: 'department', select: 'departmentCode name' }
    ]);

    // Audit log
    await AuditLogger.logInchargeAssignment({
      performedBy: req.user._id,
      performedByRole: req.user.role,
      inchargeId: incharge._id,
      teacherId: teacher,
      teacherName: incharge.teacher?.userId?.name || incharge.teacher?.employeeId,
      programId: program,
      programCode: programDoc.programCode,
      batch,
      academicYear,
      semesterNumber,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Semester incharge assigned successfully',
      data: incharge
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Incharge already exists for this program, batch, academic year, and semester combination'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error assigning semester incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Replace semester incharge (relieve current and assign new)
 * @route   PUT /api/semester-incharges/replace
 * @access  Private/Admin
 */
export const replaceSemesterIncharge = async (req, res) => {
  try {
    const {
      program,
      batch,
      academicYear,
      semesterNumber,
      newTeacher,
      responsibilities,
      remarks,
      relieveRemarks
    } = req.body;

    if (!program || !batch || !academicYear || !semesterNumber || !newTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Please provide program, batch, academicYear, semesterNumber, and newTeacher'
      });
    }

    // Validate new teacher exists
    const teacherDoc = await Teacher.findById(newTeacher);
    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'New teacher not found'
      });
    }

    // Validate program exists
    const programDoc = await Program.findById(program);
    if (!programDoc) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Find and relieve current active incharge
    const currentIncharge = await SemesterIncharge.findOne({
      program,
      batch,
      academicYear,
      semesterNumber: parseInt(semesterNumber),
      status: 'active'
    });

    if (currentIncharge) {
      // Check if trying to assign the same teacher
      if (currentIncharge.teacher.toString() === newTeacher) {
        return res.status(400).json({
          success: false,
          message: 'This teacher is already the incharge for this combination'
        });
      }

      // Relieve current incharge
      currentIncharge.status = 'relieved';
      currentIncharge.endDate = new Date();
      currentIncharge.remarks = relieveRemarks || `Relieved and replaced on ${new Date().toISOString().split('T')[0]}`;
      await currentIncharge.save();
    }

    // Create new incharge assignment
    const newIncharge = await SemesterIncharge.create({
      teacher: newTeacher,
      program,
      department: programDoc.department,
      batch,
      academicYear,
      semesterNumber: parseInt(semesterNumber),
      responsibilities: responsibilities || (currentIncharge ? currentIncharge.responsibilities : []),
      startDate: new Date(),
      remarks,
      appointedBy: req.user._id,
      appointedAt: new Date()
    });

    // Populate and return
    await newIncharge.populate([
      {
        path: 'teacher',
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      },
      { path: 'program', select: 'programCode name' },
      { path: 'department', select: 'departmentCode name' }
    ]);

    // Audit log for replacement
    if (currentIncharge) {
      await AuditLogger.logInchargeReplacement({
        performedBy: req.user._id,
        performedByRole: req.user.role,
        previousInchargeId: currentIncharge._id,
        previousTeacherId: currentIncharge.teacher,
        previousTeacherName: currentIncharge.teacher?.toString(),
        newInchargeId: newIncharge._id,
        newTeacherId: newTeacher,
        newTeacherName: newIncharge.teacher?.userId?.name || newIncharge.teacher?.employeeId,
        programId: program,
        programCode: programDoc.programCode,
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        reason: relieveRemarks,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } else {
      await AuditLogger.logInchargeAssignment({
        performedBy: req.user._id,
        performedByRole: req.user.role,
        inchargeId: newIncharge._id,
        teacherId: newTeacher,
        teacherName: newIncharge.teacher?.userId?.name || newIncharge.teacher?.employeeId,
        programId: program,
        programCode: programDoc.programCode,
        batch,
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json({
      success: true,
      message: currentIncharge 
        ? 'Previous incharge relieved and new incharge assigned successfully' 
        : 'New incharge assigned successfully',
      data: {
        newIncharge,
        previousIncharge: currentIncharge ? currentIncharge._id : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error replacing semester incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Update semester incharge details
 * @route   PUT /api/semester-incharges/:id
 * @access  Private/Admin
 */
export const updateSemesterIncharge = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      responsibilities,
      startDate,
      endDate,
      status,
      remarks
    } = req.body;

    const incharge = await SemesterIncharge.findById(id);

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'Semester incharge not found'
      });
    }

    // Update fields
    if (responsibilities !== undefined) incharge.responsibilities = responsibilities;
    if (startDate !== undefined) incharge.startDate = startDate;
    if (endDate !== undefined) incharge.endDate = endDate;
    if (status) incharge.status = status;
    if (remarks !== undefined) incharge.remarks = remarks;

    await incharge.save();

    // Populate and return
    await incharge.populate([
      {
        path: 'teacher',
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      },
      { path: 'program', select: 'programCode name' },
      { path: 'department', select: 'departmentCode name' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Semester incharge updated successfully',
      data: incharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating semester incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Relieve semester incharge
 * @route   PUT /api/semester-incharges/:id/relieve
 * @access  Private/Admin
 */
export const relieveSemesterIncharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const incharge = await SemesterIncharge.findById(id);

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'Semester incharge not found'
      });
    }

    if (incharge.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot relieve incharge with status: ${incharge.status}`
      });
    }

    incharge.status = 'relieved';
    incharge.endDate = new Date();
    if (remarks) incharge.remarks = remarks;

    await incharge.save();

    // Audit log
    await AuditLogger.logInchargeRelief({
      performedBy: req.user._id,
      performedByRole: req.user.role,
      inchargeId: incharge._id,
      teacherId: incharge.teacher,
      programId: incharge.program,
      academicYear: incharge.academicYear,
      semesterNumber: incharge.semesterNumber,
      reason: remarks,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Semester incharge relieved successfully',
      data: incharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error relieving semester incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Delete semester incharge (soft delete)
 * @route   DELETE /api/semester-incharges/:id
 * @access  Private/Admin
 */
export const deleteSemesterIncharge = async (req, res) => {
  try {
    const { id } = req.params;

    const incharge = await SemesterIncharge.findById(id);

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'Semester incharge not found'
      });
    }

    await incharge.softDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Semester incharge deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting semester incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Restore soft-deleted semester incharge
 * @route   POST /api/semester-incharges/:id/restore
 * @access  Private/Admin
 */
export const restoreSemesterIncharge = async (req, res) => {
  try {
    const { id } = req.params;

    const incharge = await SemesterIncharge.findById(id).setOptions({ includeSoftDeleted: true });

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'Semester incharge not found'
      });
    }

    if (!incharge.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Semester incharge is not deleted'
      });
    }

    await incharge.restore();

    res.status(200).json({
      success: true,
      message: 'Semester incharge restored successfully',
      data: incharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error restoring semester incharge',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk assign incharges for a semester
 * @route   POST /api/semester-incharges/bulk
 * @access  Private/Admin
 */
export const bulkAssignIncharges = async (req, res) => {
  try {
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of assignments'
      });
    }

    const results = {
      created: [],
      errors: []
    };

    for (const assignment of assignments) {
      try {
        if (!assignment.teacher || !assignment.program || !assignment.batch || 
            !assignment.academicYear || !assignment.semesterNumber) {
          results.errors.push({
            data: assignment,
            error: 'Missing required fields'
          });
          continue;
        }

        // Check for existing active incharge
        const existing = await SemesterIncharge.findOne({
          program: assignment.program,
          batch: assignment.batch,
          academicYear: assignment.academicYear,
          semesterNumber: assignment.semesterNumber,
          status: 'active'
        });

        if (existing) {
          results.errors.push({
            data: assignment,
            error: 'Active incharge already exists'
          });
          continue;
        }

        const programDoc = await Program.findById(assignment.program);

        const incharge = await SemesterIncharge.create({
          ...assignment,
          department: assignment.department || (programDoc ? programDoc.department : null),
          appointedBy: req.user._id,
          appointedAt: new Date()
        });

        results.created.push(incharge._id);
      } catch (err) {
        results.errors.push({
          data: assignment,
          error: err.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Assigned ${results.created.length} incharges, ${results.errors.length} errors`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error bulk assigning incharges',
      error: error.message
    });
  }
};
