import Program from '../models/Program.js';
import Curriculum from '../models/Curriculum.js';

/**
 * @desc    Create a new program
 * @route   POST /api/programs
 * @access  Admin, SuperAdmin
 */
export const createProgram = async (req, res) => {
  try {
    const { name, code, description, programType, totalSemesters, coreSemestersCount, department, totalCreditHours, minimumCGPA } = req.body;

    // Check if program code already exists
    const existingProgram = await Program.findOne({ code: code.toUpperCase() });
    if (existingProgram) {
      return res.status(400).json({
        success: false,
        message: 'Program with this code already exists'
      });
    }

    // Validate coreSemestersCount <= totalSemesters
    if (coreSemestersCount > totalSemesters) {
      return res.status(400).json({
        success: false,
        message: 'Core semesters count cannot exceed total semesters'
      });
    }

    const program = await Program.create({
      name,
      code,
      description,
      programType,
      totalSemesters,
      coreSemestersCount,
      department,
      totalCreditHours,
      minimumCGPA
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
 * @desc    Get all programs
 * @route   GET /api/programs
 * @access  All authenticated users
 */
export const getPrograms = async (req, res) => {
  try {
    const { department, programType, isActive } = req.query;
    
    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (programType) filter.programType = programType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const programs = await Program.find(filter).sort({ name: 1 });

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
 * @desc    Get single program by ID
 * @route   GET /api/programs/:id
 * @access  All authenticated users
 */
export const getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

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
 * @desc    Update program
 * @route   PUT /api/programs/:id
 * @access  Admin, SuperAdmin
 */
export const updateProgram = async (req, res) => {
  try {
    const { name, description, programType, totalSemesters, coreSemestersCount, department, totalCreditHours, minimumCGPA, isActive } = req.body;

    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Validate coreSemestersCount if being updated
    const newTotalSemesters = totalSemesters || program.totalSemesters;
    const newCoreSemesters = coreSemestersCount || program.coreSemestersCount;
    if (newCoreSemesters > newTotalSemesters) {
      return res.status(400).json({
        success: false,
        message: 'Core semesters count cannot exceed total semesters'
      });
    }

    const updatedProgram = await Program.findByIdAndUpdate(
      req.params.id,
      { name, description, programType, totalSemesters, coreSemestersCount, department, totalCreditHours, minimumCGPA, isActive },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      data: updatedProgram
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
 * @desc    Delete program
 * @route   DELETE /api/programs/:id
 * @access  SuperAdmin
 */
export const deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Check if program has associated curriculum
    const curriculumCount = await Curriculum.countDocuments({ programId: req.params.id });
    if (curriculumCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete program with associated curriculum. Remove curriculum entries first.'
      });
    }

    await Program.findByIdAndDelete(req.params.id);

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
 * @desc    Get program curriculum structure (all semesters with courses)
 * @route   GET /api/programs/:id/curriculum
 * @access  All authenticated users
 */
export const getProgramCurriculum = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Get curriculum grouped by semester
    const curriculum = await Curriculum.find({ programId: req.params.id, isActive: true })
      .populate('courseId', 'courseCode courseName creditHours')
      .sort({ semesterNumber: 1 });

    // Group by semester
    const semesters = {};
    for (let i = 1; i <= program.totalSemesters; i++) {
      semesters[i] = {
        semesterNumber: i,
        isCoreSemester: i <= program.coreSemestersCount,
        courses: []
      };
    }

    curriculum.forEach(item => {
      if (semesters[item.semesterNumber]) {
        semesters[item.semesterNumber].courses.push({
          _id: item._id,
          course: item.courseId,
          isElective: item.isElective,
          electiveGroup: item.electiveGroup,
          isMandatory: item.isMandatory
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        program,
        semesters: Object.values(semesters)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching program curriculum',
      error: error.message
    });
  }
};
