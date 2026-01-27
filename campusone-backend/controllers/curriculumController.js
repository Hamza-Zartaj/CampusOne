import Curriculum from '../models/Curriculum.js';
import Program from '../models/Program.js';
import CourseCatalog from '../models/CourseCatalog.js';

/**
 * @desc    Add course to program curriculum
 * @route   POST /api/curriculum
 * @access  Admin, SuperAdmin
 */
export const addToCurriculum = async (req, res) => {
  try {
    const { programId, courseId, semesterNumber, isElective, electiveGroup, isMandatory } = req.body;

    // Validate program exists
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Validate course exists
    const course = await CourseCatalog.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Validate semester number
    if (semesterNumber < 1 || semesterNumber > program.totalSemesters) {
      return res.status(400).json({
        success: false,
        message: `Semester number must be between 1 and ${program.totalSemesters}`
      });
    }

    // Validate elective assignment - electives should only be in later semesters
    if (isElective && semesterNumber <= program.coreSemestersCount) {
      return res.status(400).json({
        success: false,
        message: `Elective courses can only be assigned to semesters ${program.coreSemestersCount + 1} and above`
      });
    }

    // Check for duplicate entry
    const existing = await Curriculum.findOne({ programId, courseId, semesterNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This course is already assigned to this program/semester'
      });
    }

    const curriculum = await Curriculum.create({
      programId,
      courseId,
      semesterNumber,
      isElective: isElective || false,
      electiveGroup: isElective ? electiveGroup : null,
      isMandatory: isMandatory !== false
    });

    const populated = await Curriculum.findById(curriculum._id)
      .populate('programId', 'name code')
      .populate('courseId', 'courseCode courseName creditHours');

    res.status(201).json({
      success: true,
      message: 'Course added to curriculum successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding to curriculum',
      error: error.message
    });
  }
};

/**
 * @desc    Get curriculum entries (with filters)
 * @route   GET /api/curriculum
 * @access  All authenticated users
 */
export const getCurriculum = async (req, res) => {
  try {
    const { programId, semesterNumber, isElective } = req.query;
    
    const filter = { isActive: true };
    if (programId) filter.programId = programId;
    if (semesterNumber) filter.semesterNumber = parseInt(semesterNumber);
    if (isElective !== undefined) filter.isElective = isElective === 'true';

    const curriculum = await Curriculum.find(filter)
      .populate('programId', 'name code')
      .populate('courseId', 'courseCode courseName creditHours')
      .sort({ semesterNumber: 1 });

    res.status(200).json({
      success: true,
      count: curriculum.length,
      data: curriculum
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
 * @desc    Update curriculum entry
 * @route   PUT /api/curriculum/:id
 * @access  Admin, SuperAdmin
 */
export const updateCurriculum = async (req, res) => {
  try {
    const { semesterNumber, isElective, electiveGroup, isMandatory, isActive } = req.body;

    const curriculum = await Curriculum.findById(req.params.id);
    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: 'Curriculum entry not found'
      });
    }

    // Get program for validation
    const program = await Program.findById(curriculum.programId);
    
    // Validate semester number if being updated
    if (semesterNumber) {
      if (semesterNumber < 1 || semesterNumber > program.totalSemesters) {
        return res.status(400).json({
          success: false,
          message: `Semester number must be between 1 and ${program.totalSemesters}`
        });
      }
    }

    // Validate elective assignment
    const newSemester = semesterNumber || curriculum.semesterNumber;
    const newIsElective = isElective !== undefined ? isElective : curriculum.isElective;
    
    if (newIsElective && newSemester <= program.coreSemestersCount) {
      return res.status(400).json({
        success: false,
        message: `Elective courses can only be assigned to semesters ${program.coreSemestersCount + 1} and above`
      });
    }

    const updated = await Curriculum.findByIdAndUpdate(
      req.params.id,
      {
        semesterNumber,
        isElective,
        electiveGroup: newIsElective ? electiveGroup : null,
        isMandatory,
        isActive
      },
      { new: true, runValidators: true }
    )
      .populate('programId', 'name code')
      .populate('courseId', 'courseCode courseName creditHours');

    res.status(200).json({
      success: true,
      message: 'Curriculum updated successfully',
      data: updated
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
 * @desc    Remove course from curriculum
 * @route   DELETE /api/curriculum/:id
 * @access  Admin, SuperAdmin
 */
export const removeFromCurriculum = async (req, res) => {
  try {
    const curriculum = await Curriculum.findById(req.params.id);
    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: 'Curriculum entry not found'
      });
    }

    await Curriculum.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Course removed from curriculum successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing from curriculum',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk add courses to curriculum
 * @route   POST /api/curriculum/bulk
 * @access  Admin, SuperAdmin
 */
export const bulkAddToCurriculum = async (req, res) => {
  try {
    const { programId, courses } = req.body;
    // courses: [{ courseId, semesterNumber, isElective, electiveGroup, isMandatory }]

    // Validate program
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    const results = { success: [], failed: [] };

    for (const item of courses) {
      try {
        // Validate course exists
        const course = await CourseCatalog.findById(item.courseId);
        if (!course) {
          results.failed.push({ ...item, error: 'Course not found' });
          continue;
        }

        // Validate semester
        if (item.semesterNumber < 1 || item.semesterNumber > program.totalSemesters) {
          results.failed.push({ ...item, error: 'Invalid semester number' });
          continue;
        }

        // Check for duplicate
        const existing = await Curriculum.findOne({
          programId,
          courseId: item.courseId,
          semesterNumber: item.semesterNumber
        });
        if (existing) {
          results.failed.push({ ...item, error: 'Already exists in curriculum' });
          continue;
        }

        // Validate elective placement
        if (item.isElective && item.semesterNumber <= program.coreSemestersCount) {
          results.failed.push({ ...item, error: 'Elective cannot be in core semester' });
          continue;
        }

        const curriculum = await Curriculum.create({
          programId,
          courseId: item.courseId,
          semesterNumber: item.semesterNumber,
          isElective: item.isElective || false,
          electiveGroup: item.isElective ? item.electiveGroup : null,
          isMandatory: item.isMandatory !== false
        });

        results.success.push(curriculum);
      } catch (err) {
        results.failed.push({ ...item, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Added ${results.success.length} courses, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in bulk curriculum add',
      error: error.message
    });
  }
};
