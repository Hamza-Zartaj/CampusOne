import prisma from '../prisma/client.js';

/**
 * @desc    Get all programs with pagination and search
 * @route   GET /api/programs
 * @access  Private/Admin
 */
export const getAllPrograms = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, type, isActive, includeSoftDeleted } = req.query;

    // Build where clause
    const where = {};

    // Filter by department
    if (department) {
      where.departmentId = department;
    }

    // Filter by program type
    if (type) {
      where.type = type;
    }

    // Filter by active status
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    // Search by name, code, or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { programCode: { contains: search, mode: 'insensitive' } },
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
    const total = await prisma.program.count({ where });

    // Get programs
    const programs = await prisma.program.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            departmentCode: true,
            name: true
          }
        }
      },
      orderBy: { programCode: 'asc' },
      skip,
      take: limitNum
    });

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

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            departmentCode: true,
            name: true
          }
        }
      }
    });

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

    const where = { departmentId };
    
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    const programs = await prisma.program.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            departmentCode: true,
            name: true
          }
        }
      },
      orderBy: { programCode: 'asc' }
    });

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
      departmentId,
      type,
      durationYears,
      totalSemesters,
      totalCredits,
      eligibilityCriteria
    } = req.body;

    // Check if program code already exists
    const existingProgram = await prisma.program.findUnique({
      where: { programCode: programCode.toUpperCase() }
    });
    
    if (existingProgram) {
      return res.status(400).json({
        success: false,
        message: 'Program with this code already exists'
      });
    }

    const program = await prisma.program.create({
      data: {
        programCode: programCode.toUpperCase(),
        name,
        description,
        departmentId,
        type,
        durationYears,
        totalSemesters,
        totalCredits,
        eligibilityCriteria
      },
      include: {
        department: {
          select: {
            id: true,
            departmentCode: true,
            name: true
          }
        }
      }
    });

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
      departmentId,
      type,
      durationYears,
      totalSemesters,
      totalCredits,
      eligibilityCriteria,
      isActive
    } = req.body;

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Check if updating to a code that already exists
    if (programCode && programCode.toUpperCase() !== program.programCode) {
      const existingProgram = await prisma.program.findUnique({
        where: { programCode: programCode.toUpperCase() }
      });
      
      if (existingProgram) {
        return res.status(400).json({
          success: false,
          message: 'Program with this code already exists'
        });
      }
    }

    // Build update data
    const updateData = {};
    
    if (programCode) updateData.programCode = programCode.toUpperCase();
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (departmentId) updateData.departmentId = departmentId;
    if (type) updateData.type = type;
    if (durationYears) updateData.durationYears = durationYears;
    if (totalSemesters) updateData.totalSemesters = totalSemesters;
    if (totalCredits) updateData.totalCredits = totalCredits;
    if (eligibilityCriteria !== undefined) updateData.eligibilityCriteria = eligibilityCriteria;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.program.update({
      where: { id },
      data: updateData,
      include: {
        department: {
          select: {
            id: true,
            departmentCode: true,
            name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      data: updated
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

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    await prisma.program.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user?.id
      }
    });

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

    const program = await prisma.program.findUnique({
      where: { id }
    });

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

    const restored = await prisma.program.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      },
      include: {
        department: {
          select: {
            id: true,
            departmentCode: true,
            name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Program restored successfully',
      data: restored
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

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    await prisma.program.delete({
      where: { id }
    });

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

/**
 * @desc    Get program curriculum (all semesters)
 * @route   GET /api/programs/:id/curriculum
 * @access  Private
 */
export const getProgramCurriculum = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({
      where: { id },
      select: {
        programCode: true,
        name: true,
        totalSemesters: true,
        totalCredits: true,
        curriculum: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Sort curriculum by semester number
    const sortedCurriculum = (program.curriculum || []).sort((a, b) => a.semesterNumber - b.semesterNumber);

    // Calculate totals per semester
    const curriculumWithTotals = sortedCurriculum.map(sem => {
      const requiredCredits = (sem.requiredCourses || []).reduce((sum, rc) => {
        return sum + (rc.creditHours || 0);
      }, 0);
      
      const electiveMinCredits = (sem.electiveSlots || []).reduce((sum, es) => sum + (es.minCredits || 0), 0);
      const electiveMaxCredits = (sem.electiveSlots || []).reduce((sum, es) => sum + (es.maxCredits || 0), 0);

      return {
        ...sem,
        calculatedCredits: {
          required: requiredCredits,
          electiveMin: electiveMinCredits,
          electiveMax: electiveMaxCredits,
          totalMin: requiredCredits + electiveMinCredits,
          totalMax: requiredCredits + electiveMaxCredits
        }
      };
    });

    res.status(200).json({
      success: true,
      data: {
        programCode: program.programCode,
        name: program.name,
        totalSemesters: program.totalSemesters,
        totalCredits: program.totalCredits,
        curriculum: curriculumWithTotals
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching curriculum',
      error: error.message
    });
  }
};

/**
 * @desc    Get curriculum for a specific semester
 * @route   GET /api/programs/:id/curriculum/semester/:semesterNumber
 * @access  Private
 */
export const getCurriculumBySemester = async (req, res) => {
  try {
    const { id, semesterNumber } = req.params;
    const semNum = parseInt(semesterNumber);

    const program = await prisma.program.findUnique({
      where: { id },
      select: {
        programCode: true,
        name: true,
        totalSemesters: true,
        curriculum: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    if (semNum < 1 || semNum > program.totalSemesters) {
      return res.status(400).json({
        success: false,
        message: `Invalid semester number. Must be between 1 and ${program.totalSemesters}`
      });
    }

    const semesterCurriculum = (program.curriculum || []).find(s => s.semesterNumber === semNum);

    if (!semesterCurriculum) {
      return res.status(200).json({
        success: true,
        data: {
          programCode: program.programCode,
          programName: program.name,
          semesterNumber: semNum,
          semesterName: null,
          requiredCourses: [],
          electiveSlots: [],
          minCredits: 0,
          maxCredits: 24,
          notes: null,
          message: 'No curriculum defined for this semester yet'
        }
      });
    }

    // Calculate credits
    const requiredCredits = (semesterCurriculum.requiredCourses || []).reduce((sum, rc) => {
      return sum + (rc.creditHours || 0);
    }, 0);
    
    const electiveMinCredits = (semesterCurriculum.electiveSlots || []).reduce((sum, es) => sum + (es.minCredits || 0), 0);
    const electiveMaxCredits = (semesterCurriculum.electiveSlots || []).reduce((sum, es) => sum + (es.maxCredits || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        programCode: program.programCode,
        programName: program.name,
        ...semesterCurriculum,
        calculatedCredits: {
          required: requiredCredits,
          electiveMin: electiveMinCredits,
          electiveMax: electiveMaxCredits,
          totalMin: requiredCredits + electiveMinCredits,
          totalMax: requiredCredits + electiveMaxCredits
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching semester curriculum',
      error: error.message
    });
  }
};

/**
 * @desc    Set/update entire curriculum for a program
 * @route   PUT /api/programs/:id/curriculum
 * @access  Private/Admin
 */
export const updateProgramCurriculum = async (req, res) => {
  try {
    const { id } = req.params;
    const { curriculum } = req.body;

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Validate curriculum structure
    if (!Array.isArray(curriculum)) {
      return res.status(400).json({
        success: false,
        message: 'Curriculum must be an array of semester objects'
      });
    }

    // Validate each semester
    for (const sem of curriculum) {
      if (!sem.semesterNumber || sem.semesterNumber < 1 || sem.semesterNumber > program.totalSemesters) {
        return res.status(400).json({
          success: false,
          message: `Invalid semester number. Must be between 1 and ${program.totalSemesters}`
        });
      }
    }

    // Check for duplicate semester numbers
    const semesterNumbers = curriculum.map(s => s.semesterNumber);
    const uniqueSemesters = new Set(semesterNumbers);
    if (semesterNumbers.length !== uniqueSemesters.size) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate semester numbers found in curriculum'
      });
    }

    const updated = await prisma.program.update({
      where: { id },
      data: { curriculum }
    });

    res.status(200).json({
      success: true,
      message: 'Curriculum updated successfully',
      data: updated.curriculum?.sort((a, b) => a.semesterNumber - b.semesterNumber) || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating curriculum',
      error: error.message
    });
  }
};

/**
 * @desc    Set/update curriculum for a specific semester
 * @route   PUT /api/programs/:id/curriculum/semester/:semesterNumber
 * @access  Private/Admin
 */
export const updateSemesterCurriculum = async (req, res) => {
  try {
    const { id, semesterNumber } = req.params;
    const semNum = parseInt(semesterNumber);
    const { semesterName, requiredCourses, electiveSlots, minCredits, maxCredits, notes } = req.body;

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    if (semNum < 1 || semNum > program.totalSemesters) {
      return res.status(400).json({
        success: false,
        message: `Invalid semester number. Must be between 1 and ${program.totalSemesters}`
      });
    }

    // Find existing semester entry or create new one
    const curriculum = program.curriculum || [];
    const semIndex = curriculum.findIndex(s => s.semesterNumber === semNum);
    
    const semesterData = {
      semesterNumber: semNum,
      semesterName: semesterName || `Semester ${semNum}`,
      requiredCourses: requiredCourses || [],
      electiveSlots: electiveSlots || [],
      minCredits: minCredits || 0,
      maxCredits: maxCredits || 24,
      notes: notes
    };

    if (semIndex >= 0) {
      curriculum[semIndex] = semesterData;
    } else {
      curriculum.push(semesterData);
    }

    const updated = await prisma.program.update({
      where: { id },
      data: { curriculum }
    });

    const updatedSemester = updated.curriculum.find(s => s.semesterNumber === semNum);

    res.status(200).json({
      success: true,
      message: `Semester ${semNum} curriculum updated successfully`,
      data: updatedSemester
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating semester curriculum',
      error: error.message
    });
  }
};

/**
 * @desc    Add a course to a semester's required courses
 * @route   POST /api/programs/:id/curriculum/semester/:semesterNumber/course
 * @access  Private/Admin
 */
export const addCourseToSemester = async (req, res) => {
  try {
    const { id, semesterNumber } = req.params;
    const semNum = parseInt(semesterNumber);
    const { courseId, isCompulsory = true } = req.body;

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    if (semNum < 1 || semNum > program.totalSemesters) {
      return res.status(400).json({
        success: false,
        message: `Invalid semester number. Must be between 1 and ${program.totalSemesters}`
      });
    }

    // Validate course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Find or create semester entry
    const curriculum = program.curriculum || [];
    let semIndex = curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      curriculum.push({
        semesterNumber: semNum,
        semesterName: `Semester ${semNum}`,
        requiredCourses: [],
        electiveSlots: []
      });
      semIndex = curriculum.length - 1;
    }

    // Check if course already exists in this semester
    const courseExists = curriculum[semIndex].requiredCourses?.some(
      rc => rc.courseId === courseId || rc.id === courseId
    );

    if (courseExists) {
      return res.status(400).json({
        success: false,
        message: 'Course already exists in this semester'
      });
    }

    // Add course
    curriculum[semIndex].requiredCourses.push({
      courseId,
      isCompulsory,
      creditHours: course.creditHours
    });

    const updated = await prisma.program.update({
      where: { id },
      data: { curriculum }
    });

    const updatedSemester = updated.curriculum.find(s => s.semesterNumber === semNum);

    res.status(200).json({
      success: true,
      message: 'Course added to semester successfully',
      data: updatedSemester
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding course to semester',
      error: error.message
    });
  }
};

/**
 * @desc    Remove a course from a semester's required courses
 * @route   DELETE /api/programs/:id/curriculum/semester/:semesterNumber/course/:courseId
 * @access  Private/Admin
 */
export const removeCourseFromSemester = async (req, res) => {
  try {
    const { id, semesterNumber, courseId } = req.params;
    const semNum = parseInt(semesterNumber);

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    const curriculum = program.curriculum || [];
    const semIndex = curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      return res.status(404).json({
        success: false,
        message: 'Semester curriculum not found'
      });
    }

    const courseIndex = curriculum[semIndex].requiredCourses?.findIndex(
      rc => rc.courseId === courseId || rc.id === courseId
    );

    if (courseIndex < 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in this semester'
      });
    }

    curriculum[semIndex].requiredCourses.splice(courseIndex, 1);

    await prisma.program.update({
      where: { id },
      data: { curriculum }
    });

    res.status(200).json({
      success: true,
      message: 'Course removed from semester successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing course from semester',
      error: error.message
    });
  }
};

/**
 * @desc    Add an elective slot to a semester
 * @route   POST /api/programs/:id/curriculum/semester/:semesterNumber/elective
 * @access  Private/Admin
 */
export const addElectiveSlot = async (req, res) => {
  try {
    const { id, semesterNumber } = req.params;
    const semNum = parseInt(semesterNumber);
    const { slotName, minCredits, maxCredits, allowedCourses } = req.body;

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    if (semNum < 1 || semNum > program.totalSemesters) {
      return res.status(400).json({
        success: false,
        message: `Invalid semester number. Must be between 1 and ${program.totalSemesters}`
      });
    }

    // Find or create semester entry
    const curriculum = program.curriculum || [];
    let semIndex = curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      curriculum.push({
        semesterNumber: semNum,
        semesterName: `Semester ${semNum}`,
        requiredCourses: [],
        electiveSlots: []
      });
      semIndex = curriculum.length - 1;
    }

    // Add elective slot
    curriculum[semIndex].electiveSlots = curriculum[semIndex].electiveSlots || [];
    curriculum[semIndex].electiveSlots.push({
      slotName,
      minCredits,
      maxCredits,
      allowedCourses: allowedCourses || []
    });

    const updated = await prisma.program.update({
      where: { id },
      data: { curriculum }
    });

    const updatedSemester = updated.curriculum.find(s => s.semesterNumber === semNum);

    res.status(200).json({
      success: true,
      message: 'Elective slot added successfully',
      data: updatedSemester
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding elective slot',
      error: error.message
    });
  }
};

/**
 * @desc    Remove an elective slot from a semester
 * @route   DELETE /api/programs/:id/curriculum/semester/:semesterNumber/elective/:slotId
 * @access  Private/Admin
 */
export const removeElectiveSlot = async (req, res) => {
  try {
    const { id, semesterNumber, slotId } = req.params;
    const semNum = parseInt(semesterNumber);

    const program = await prisma.program.findUnique({
      where: { id }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    const curriculum = program.curriculum || [];
    const semIndex = curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      return res.status(404).json({
        success: false,
        message: 'Semester curriculum not found'
      });
    }

    const slotIndex = curriculum[semIndex].electiveSlots?.findIndex(
      slot => slot.id === slotId
    );

    if (slotIndex < 0) {
      return res.status(404).json({
        success: false,
        message: 'Elective slot not found'
      });
    }

    curriculum[semIndex].electiveSlots.splice(slotIndex, 1);

    await prisma.program.update({
      where: { id },
      data: { curriculum }
    });

    res.status(200).json({
      success: true,
      message: 'Elective slot removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing elective slot',
      error: error.message
    });
  }
};

export default {
  getAllPrograms,
  getProgramById,
  getProgramsByDepartment,
  createProgram,
  updateProgram,
  deleteProgram,
  restoreProgram,
  permanentDeleteProgram,
  getProgramCurriculum,
  getCurriculumBySemester,
  updateProgramCurriculum,
  updateSemesterCurriculum,
  addCourseToSemester,
  removeCourseFromSemester,
  addElectiveSlot,
  removeElectiveSlot
};
