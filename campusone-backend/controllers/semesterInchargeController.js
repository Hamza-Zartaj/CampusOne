import prisma from '../prisma/client.js';
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

    // Build where clause
    const where = {
      ...(includeSoftDeleted !== 'true' && { isDeleted: false })
    };

    if (teacher) where.teacherId = teacher;
    if (program) where.programId = program;
    if (department) where.departmentId = department;
    if (batch) where.batch = batch;
    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);
    if (status) where.status = status;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.semesterIncharge.count({ where });

    // Get semester incharges
    const incharges = await prisma.semesterIncharge.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        program: {
          select: { programCode: true, name: true }
        }
      },
      orderBy: [
        { academicYear: 'desc' },
        { semesterNumber: 'asc' },
        { batch: 'asc' }
      ],
      skip,
      take: limitNum
    });

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

    const incharge = await prisma.semesterIncharge.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        program: {
          select: { programCode: true, name: true, totalSemesters: true }
        }
      }
    });

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

    const incharge = await prisma.semesterIncharge.findFirst({
      where: {
        programId: program,
        batch,
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        status: 'active',
        isDeleted: false
      },
      include: {
        teacher: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        program: {
          select: { programCode: true, name: true }
        }
      }
    });

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

    const where = {
      teacherId,
      isDeleted: false
    };

    if (status) where.status = status;
    if (academicYear) where.academicYear = academicYear;

    const incharges = await prisma.semesterIncharge.findMany({
      where,
      include: {
        program: {
          select: { programCode: true, name: true }
        }
      },
      orderBy: [
        { academicYear: 'desc' },
        { semesterNumber: 'asc' }
      ]
    });

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
    const teacherDoc = await prisma.teacher.findUnique({
      where: { id: teacher }
    });
    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Validate program exists
    const programDoc = await prisma.program.findUnique({
      where: { id: program }
    });
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
      const departmentDoc = await prisma.department.findUnique({
        where: { id: department }
      });
      if (!departmentDoc) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
    }

    // Check if there's already an active incharge for this combination
    const existingIncharge = await prisma.semesterIncharge.findFirst({
      where: {
        programId: program,
        batch,
        academicYear,
        semesterNumber,
        status: 'active',
        isDeleted: false
      }
    });

    if (existingIncharge) {
      return res.status(400).json({
        success: false,
        message: 'An active incharge already exists for this program, batch, academic year, and semester. Use replace endpoint to change.',
        existingIncharge: existingIncharge.id
      });
    }

    const incharge = await prisma.semesterIncharge.create({
      data: {
        teacherId: teacher,
        programId: program,
        departmentId: department || programDoc.departmentId,
        batch,
        academicYear,
        semesterNumber,
        responsibilities: responsibilities || [],
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        remarks,
        appointedBy: req.user.id,
        appointedAt: new Date()
      },
      include: {
        teacher: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        program: {
          select: { programCode: true, name: true }
        }
      }
    });

    // Audit log
    await AuditLogger.logInchargeAssignment({
      performedBy: req.user.id,
      performedByRole: req.user.role,
      inchargeId: incharge.id,
      teacherId: teacher,
      teacherName: incharge.teacher?.user?.name || incharge.teacher?.employeeId,
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
    if (error.code === 'P2002') {
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
    const teacherDoc = await prisma.teacher.findUnique({
      where: { id: newTeacher }
    });
    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'New teacher not found'
      });
    }

    // Validate program exists
    const programDoc = await prisma.program.findUnique({
      where: { id: program }
    });
    if (!programDoc) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Find and relieve current active incharge
    const currentIncharge = await prisma.semesterIncharge.findFirst({
      where: {
        programId: program,
        batch,
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        status: 'active',
        isDeleted: false
      }
    });

    let relievedIncharge = null;

    if (currentIncharge) {
      // Check if trying to assign the same teacher
      if (currentIncharge.teacherId === newTeacher) {
        return res.status(400).json({
          success: false,
          message: 'This teacher is already the incharge for this combination'
        });
      }

      // Relieve current incharge
      relievedIncharge = await prisma.semesterIncharge.update({
        where: { id: currentIncharge.id },
        data: {
          status: 'relieved',
          endDate: new Date(),
          remarks: relieveRemarks || `Relieved and replaced on ${new Date().toISOString().split('T')[0]}`
        }
      });
    }

    // Create new incharge assignment
    const newIncharge = await prisma.semesterIncharge.create({
      data: {
        teacherId: newTeacher,
        programId: program,
        departmentId: programDoc.departmentId,
        batch,
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        responsibilities: responsibilities || (currentIncharge ? currentIncharge.responsibilities : []),
        startDate: new Date(),
        remarks,
        appointedBy: req.user.id,
        appointedAt: new Date()
      },
      include: {
        teacher: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        program: {
          select: { programCode: true, name: true }
        }
      }
    });

    // Audit log for replacement
    if (currentIncharge) {
      await AuditLogger.logInchargeReplacement({
        performedBy: req.user.id,
        performedByRole: req.user.role,
        previousInchargeId: currentIncharge.id,
        previousTeacherId: currentIncharge.teacherId,
        newInchargeId: newIncharge.id,
        newTeacherId: newTeacher,
        newTeacherName: newIncharge.teacher?.user?.name || newIncharge.teacher?.employeeId,
        programId: program,
        programCode: programDoc.programCode,
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        reason: relieveRemarks,
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
        previousIncharge: relievedIncharge ? relievedIncharge.id : null
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

    const incharge = await prisma.semesterIncharge.findUnique({
      where: { id }
    });

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'Semester incharge not found'
      });
    }

    // Update fields
    const updateData = {};
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const updated = await prisma.semesterIncharge.update({
      where: { id },
      data: updateData,
      include: {
        teacher: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        program: {
          select: { programCode: true, name: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Semester incharge updated successfully',
      data: updated
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

    const incharge = await prisma.semesterIncharge.findUnique({
      where: { id }
    });

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

    const updated = await prisma.semesterIncharge.update({
      where: { id },
      data: {
        status: 'relieved',
        endDate: new Date(),
        remarks: remarks || incharge.remarks
      }
    });

    // Audit log
    await AuditLogger.logInchargeRelief({
      performedBy: req.user.id,
      performedByRole: req.user.role,
      inchargeId: incharge.id,
      teacherId: incharge.teacherId,
      programId: incharge.programId,
      academicYear: incharge.academicYear,
      semesterNumber: incharge.semesterNumber,
      reason: remarks,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Semester incharge relieved successfully',
      data: updated
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

    const incharge = await prisma.semesterIncharge.findUnique({
      where: { id }
    });

    if (!incharge) {
      return res.status(404).json({
        success: false,
        message: 'Semester incharge not found'
      });
    }

    await prisma.semesterIncharge.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id
      }
    });

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

    const incharge = await prisma.semesterIncharge.findUnique({
      where: { id }
    });

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

    const restored = await prisma.semesterIncharge.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Semester incharge restored successfully',
      data: restored
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
 * @desc    Bulk assign semester incharges
 * @route   POST /api/semester-incharges/bulk
 * @access  Private (Admin)
 */
export const bulkAssignIncharges = async (req, res) => {
  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid assignments array' });
    }

    const results = { successful: [], failed: [] };

    for (const assignment of assignments) {
      try {
        const { teacherId, programId, departmentId, academicYear, semesterNumber, scope } = assignment;

        if (!teacherId || !academicYear || !semesterNumber) {
          results.failed.push({ ...assignment, error: 'teacherId, academicYear, and semesterNumber are required' });
          continue;
        }

        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) {
          results.failed.push({ ...assignment, error: 'Teacher not found' });
          continue;
        }

        // Deactivate existing incharge for the same scope if any
        await prisma.semesterIncharge.updateMany({
          where: {
            programId: programId || null,
            departmentId: departmentId || null,
            academicYear,
            semesterNumber: parseInt(semesterNumber),
            status: 'active'
          },
          data: { status: 'relieved', relievedAt: new Date() }
        });

        const incharge = await prisma.semesterIncharge.create({
          data: {
            teacherId,
            programId: programId || null,
            departmentId: departmentId || null,
            academicYear,
            semesterNumber: parseInt(semesterNumber),
            scope: scope || 'program',
            status: 'active',
            assignedBy: req.user?.id,
            assignedAt: new Date()
          }
        });

        results.successful.push(incharge);
      } catch (err) {
        results.failed.push({ ...assignment, error: err.message });
      }
    }

    res.status(201).json({
      success: results.failed.length === 0,
      message: `${results.successful.length} assigned, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error in bulk assign incharges', error: error.message });
  }
};
