import Program from '../models/Program.js';
import Course from '../models/Course.js';

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

/**
 * @desc    Get program curriculum (all semesters)
 * @route   GET /api/programs/:id/curriculum
 * @access  Private
 */
export const getProgramCurriculum = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id)
      .select('programCode name totalSemesters totalCredits curriculum')
      .populate('curriculum.requiredCourses.course', 'courseCode courseName creditHours courseType domain')
      .populate('curriculum.electiveSlots.allowedCourses', 'courseCode courseName creditHours courseType domain');

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Sort curriculum by semester number
    const sortedCurriculum = program.curriculum.sort((a, b) => a.semesterNumber - b.semesterNumber);

    // Calculate totals per semester
    const curriculumWithTotals = sortedCurriculum.map(sem => {
      const requiredCredits = sem.requiredCourses.reduce((sum, rc) => {
        return sum + (rc.course?.creditHours || 0);
      }, 0);
      
      const electiveMinCredits = sem.electiveSlots.reduce((sum, es) => sum + (es.minCredits || 0), 0);
      const electiveMaxCredits = sem.electiveSlots.reduce((sum, es) => sum + (es.maxCredits || 0), 0);

      return {
        ...sem.toObject(),
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

    const program = await Program.findById(id)
      .select('programCode name totalSemesters curriculum')
      .populate('curriculum.requiredCourses.course', 'courseCode courseName creditHours courseType domain description prerequisites')
      .populate('curriculum.electiveSlots.allowedCourses', 'courseCode courseName creditHours courseType domain description');

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

    const semesterCurriculum = program.curriculum.find(s => s.semesterNumber === semNum);

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
    const requiredCredits = semesterCurriculum.requiredCourses.reduce((sum, rc) => {
      return sum + (rc.course?.creditHours || 0);
    }, 0);
    
    const electiveMinCredits = semesterCurriculum.electiveSlots.reduce((sum, es) => sum + (es.minCredits || 0), 0);
    const electiveMaxCredits = semesterCurriculum.electiveSlots.reduce((sum, es) => sum + (es.maxCredits || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        programCode: program.programCode,
        programName: program.name,
        ...semesterCurriculum.toObject(),
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

    const program = await Program.findById(id);

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

      // Validate required courses exist
      if (sem.requiredCourses && sem.requiredCourses.length > 0) {
        const courseIds = sem.requiredCourses.map(rc => rc.course);
        const courses = await Course.find({ _id: { $in: courseIds } });
        if (courses.length !== courseIds.length) {
          return res.status(400).json({
            success: false,
            message: `One or more required courses not found in semester ${sem.semesterNumber}`
          });
        }
      }

      // Validate allowed courses in elective slots
      if (sem.electiveSlots && sem.electiveSlots.length > 0) {
        for (const slot of sem.electiveSlots) {
          if (slot.allowedCourses && slot.allowedCourses.length > 0) {
            const courses = await Course.find({ _id: { $in: slot.allowedCourses } });
            if (courses.length !== slot.allowedCourses.length) {
              return res.status(400).json({
                success: false,
                message: `One or more allowed courses not found in elective slot "${slot.slotName}" for semester ${sem.semesterNumber}`
              });
            }
          }
        }
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

    program.curriculum = curriculum;
    await program.save();

    // Populate and return
    await program.populate([
      { path: 'curriculum.requiredCourses.course', select: 'courseCode courseName creditHours courseType domain' },
      { path: 'curriculum.electiveSlots.allowedCourses', select: 'courseCode courseName creditHours courseType domain' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Curriculum updated successfully',
      data: program.curriculum.sort((a, b) => a.semesterNumber - b.semesterNumber)
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

    const program = await Program.findById(id);

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

    // Validate required courses exist
    if (requiredCourses && requiredCourses.length > 0) {
      const courseIds = requiredCourses.map(rc => rc.course);
      const courses = await Course.find({ _id: { $in: courseIds } });
      if (courses.length !== courseIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more required courses not found'
        });
      }
    }

    // Validate allowed courses in elective slots
    if (electiveSlots && electiveSlots.length > 0) {
      for (const slot of electiveSlots) {
        if (slot.allowedCourses && slot.allowedCourses.length > 0) {
          const courses = await Course.find({ _id: { $in: slot.allowedCourses } });
          if (courses.length !== slot.allowedCourses.length) {
            return res.status(400).json({
              success: false,
              message: `One or more allowed courses not found in elective slot "${slot.slotName}"`
            });
          }
        }
      }
    }

    // Find existing semester entry or create new one
    const semIndex = program.curriculum.findIndex(s => s.semesterNumber === semNum);
    
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
      program.curriculum[semIndex] = semesterData;
    } else {
      program.curriculum.push(semesterData);
    }

    await program.save();

    // Populate and get the updated semester
    await program.populate([
      { path: 'curriculum.requiredCourses.course', select: 'courseCode courseName creditHours courseType domain' },
      { path: 'curriculum.electiveSlots.allowedCourses', select: 'courseCode courseName creditHours courseType domain' }
    ]);

    const updatedSemester = program.curriculum.find(s => s.semesterNumber === semNum);

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

    const program = await Program.findById(id);

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
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Find or create semester entry
    let semIndex = program.curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      program.curriculum.push({
        semesterNumber: semNum,
        semesterName: `Semester ${semNum}`,
        requiredCourses: [],
        electiveSlots: []
      });
      semIndex = program.curriculum.length - 1;
    }

    // Check if course already exists in this semester
    const courseExists = program.curriculum[semIndex].requiredCourses.some(
      rc => rc.course.toString() === courseId
    );

    if (courseExists) {
      return res.status(400).json({
        success: false,
        message: 'Course already exists in this semester'
      });
    }

    // Add course
    program.curriculum[semIndex].requiredCourses.push({
      course: courseId,
      isCompulsory
    });

    await program.save();

    // Populate and return
    await program.populate('curriculum.requiredCourses.course', 'courseCode courseName creditHours courseType domain');

    const updatedSemester = program.curriculum.find(s => s.semesterNumber === semNum);

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

    const program = await Program.findById(id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    const semIndex = program.curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      return res.status(404).json({
        success: false,
        message: 'Semester curriculum not found'
      });
    }

    const courseIndex = program.curriculum[semIndex].requiredCourses.findIndex(
      rc => rc.course.toString() === courseId
    );

    if (courseIndex < 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in this semester'
      });
    }

    program.curriculum[semIndex].requiredCourses.splice(courseIndex, 1);
    await program.save();

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
    const { slotName, domain, category, minCredits, maxCredits, allowedCourses, description } = req.body;

    const program = await Program.findById(id);

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

    // Validate allowed courses if provided
    if (allowedCourses && allowedCourses.length > 0) {
      const courses = await Course.find({ _id: { $in: allowedCourses } });
      if (courses.length !== allowedCourses.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more allowed courses not found'
        });
      }
    }

    // Find or create semester entry
    let semIndex = program.curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      program.curriculum.push({
        semesterNumber: semNum,
        semesterName: `Semester ${semNum}`,
        requiredCourses: [],
        electiveSlots: []
      });
      semIndex = program.curriculum.length - 1;
    }

    // Add elective slot
    program.curriculum[semIndex].electiveSlots.push({
      slotName: slotName || `Elective ${program.curriculum[semIndex].electiveSlots.length + 1}`,
      domain,
      category: category || 'program',
      minCredits: minCredits || 3,
      maxCredits: maxCredits || 4,
      allowedCourses: allowedCourses || [],
      description
    });

    await program.save();

    // Populate and return
    await program.populate('curriculum.electiveSlots.allowedCourses', 'courseCode courseName creditHours courseType domain');

    const updatedSemester = program.curriculum.find(s => s.semesterNumber === semNum);

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
 * @route   DELETE /api/programs/:id/curriculum/semester/:semesterNumber/elective/:slotIndex
 * @access  Private/Admin
 */
export const removeElectiveSlot = async (req, res) => {
  try {
    const { id, semesterNumber, slotIndex } = req.params;
    const semNum = parseInt(semesterNumber);
    const slotIdx = parseInt(slotIndex);

    const program = await Program.findById(id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    const semIndex = program.curriculum.findIndex(s => s.semesterNumber === semNum);
    
    if (semIndex < 0) {
      return res.status(404).json({
        success: false,
        message: 'Semester curriculum not found'
      });
    }

    if (slotIdx < 0 || slotIdx >= program.curriculum[semIndex].electiveSlots.length) {
      return res.status(404).json({
        success: false,
        message: 'Elective slot not found'
      });
    }

    program.curriculum[semIndex].electiveSlots.splice(slotIdx, 1);
    await program.save();

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
