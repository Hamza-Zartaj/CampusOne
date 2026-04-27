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
      select: { programCode: true, name: true, totalSemesters: true, totalCredits: true }
    });

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    const entries = await prisma.programCurriculumEntry.findMany({
      where: { programId: id },
      include: { course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } } },
      orderBy: [{ semesterNumber: 'asc' }, { course: { courseCode: 'asc' } }]
    });

    // Group by semester
    const bySemester = {};
    for (const entry of entries) {
      if (!bySemester[entry.semesterNumber]) bySemester[entry.semesterNumber] = [];
      bySemester[entry.semesterNumber].push(entry);
    }

    const curriculum = Object.keys(bySemester).sort((a, b) => a - b).map(sem => {
      const semEntries = bySemester[sem];
      const totalCredits = semEntries.reduce((s, e) => s + (e.course.creditHours || 0), 0);
      return {
        semesterNumber: parseInt(sem),
        courses: semEntries.map(e => ({ id: e.id, courseId: e.course.id, courseCode: e.course.courseCode, courseName: e.course.courseName, creditHours: e.course.creditHours, courseType: e.course.courseType, isElective: e.isElective })),
        totalCredits
      };
    });

    res.status(200).json({
      success: true,
      data: { programCode: program.programCode, name: program.name, totalSemesters: program.totalSemesters, totalCredits: program.totalCredits, curriculum }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching curriculum', error: error.message });
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

    const program = await prisma.program.findUnique({ where: { id }, select: { programCode: true, name: true, totalSemesters: true } });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

    const entries = await prisma.programCurriculumEntry.findMany({
      where: { programId: id, semesterNumber: semNum },
      include: { course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } } },
      orderBy: { course: { courseCode: 'asc' } }
    });

    res.status(200).json({
      success: true,
      data: {
        programCode: program.programCode,
        programName: program.name,
        semesterNumber: semNum,
        courses: entries.map(e => ({ id: e.id, courseId: e.course.id, courseCode: e.course.courseCode, courseName: e.course.courseName, creditHours: e.course.creditHours, courseType: e.course.courseType, isElective: e.isElective })),
        totalCredits: entries.reduce((s, e) => s + (e.course.creditHours || 0), 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching semester curriculum', error: error.message });
  }
};

/**
 * @desc    Add a course to a semester curriculum
 * @route   POST /api/programs/:id/curriculum/semester/:semesterNumber/course
 * @access  Private/Admin
 */
export const addCourseToSemester = async (req, res) => {
  try {
    const { id, semesterNumber } = req.params;
    const semNum = parseInt(semesterNumber);
    const { courseId, isElective = false } = req.body;

    const program = await prisma.program.findUnique({ where: { id } });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const entry = await prisma.programCurriculumEntry.create({
      data: { programId: id, courseId, semesterNumber: semNum, isElective },
      include: { course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } } }
    });

    res.status(201).json({ success: true, message: 'Course added to semester', data: entry });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Course already exists in this semester' });
    res.status(500).json({ success: false, message: 'Error adding course to semester', error: error.message });
  }
};

/**
 * @desc    Remove a course from a semester curriculum
 * @route   DELETE /api/programs/:id/curriculum/semester/:semesterNumber/course/:courseId
 * @access  Private/Admin
 */
export const removeCourseFromSemester = async (req, res) => {
  try {
    const { id, semesterNumber, courseId } = req.params;
    const semNum = parseInt(semesterNumber);

    await prisma.programCurriculumEntry.deleteMany({ where: { programId: id, courseId, semesterNumber: semNum } });

    res.status(200).json({ success: true, message: 'Course removed from semester' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing course from semester', error: error.message });
  }
};

/**
 * @desc    Set/update entire curriculum for a program (bulk upsert)
 * @route   PUT /api/programs/:id/curriculum
 * @access  Private/Admin
 */
export const updateProgramCurriculum = async (req, res) => {
  try {
    const { id } = req.params;
    const { entries } = req.body; // [{ courseId, semesterNumber, isElective }]

    const program = await prisma.program.findUnique({ where: { id } });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

    if (!Array.isArray(entries)) return res.status(400).json({ success: false, message: 'entries must be an array' });

    await prisma.programCurriculumEntry.deleteMany({ where: { programId: id } });
    await prisma.programCurriculumEntry.createMany({
      data: entries.map(e => ({ programId: id, courseId: e.courseId, semesterNumber: e.semesterNumber, isElective: e.isElective || false })),
      skipDuplicates: true
    });

    res.status(200).json({ success: true, message: 'Curriculum updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating curriculum', error: error.message });
  }
};

/**
 * @desc    Update curriculum for a specific semester (replace all courses in that semester)
 * @route   PUT /api/programs/:id/curriculum/semester/:semesterNumber
 * @access  Private/Admin
 */
export const updateSemesterCurriculum = async (req, res) => {
  try {
    const { id, semesterNumber } = req.params;
    const semNum = parseInt(semesterNumber);
    const { courses } = req.body; // [{ courseId, isElective }]

    const program = await prisma.program.findUnique({ where: { id } });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

    if (!Array.isArray(courses)) return res.status(400).json({ success: false, message: 'courses must be an array' });

    await prisma.programCurriculumEntry.deleteMany({ where: { programId: id, semesterNumber: semNum } });
    await prisma.programCurriculumEntry.createMany({
      data: courses.map(c => ({ programId: id, courseId: c.courseId, semesterNumber: semNum, isElective: c.isElective || false })),
      skipDuplicates: true
    });

    res.status(200).json({ success: true, message: `Semester ${semNum} curriculum updated` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating semester curriculum', error: error.message });
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
  removeCourseFromSemester
};
