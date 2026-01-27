import CourseOffering from '../models/CourseOffering.js';
import CourseCatalog from '../models/CourseCatalog.js';
import AcademicTerm from '../models/AcademicTerm.js';
import Program from '../models/Program.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';

/**
 * @desc    Create a new course offering
 * @route   POST /api/course-offerings
 * @access  Admin, SuperAdmin
 */
export const createCourseOffering = async (req, res) => {
  try {
    const { courseId, academicTermId, programId, section, assignedTeacher, assignedTAs, maxCapacity, schedule, isSummerRepeat } = req.body;

    // Validate course exists
    const course = await CourseCatalog.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in catalog'
      });
    }

    // Validate term exists
    const term = await AcademicTerm.findById(academicTermId);
    if (!term) {
      return res.status(404).json({
        success: false,
        message: 'Academic term not found'
      });
    }

    // Validate program exists
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Validate teacher exists and has teacher role
    const teacher = await User.findById(assignedTeacher);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Assigned teacher not found'
      });
    }
    if (!['teacher', 'admin', 'superadmin'].includes(teacher.role)) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user must have teacher role'
      });
    }

    // Validate TAs if provided
    if (assignedTAs && assignedTAs.length > 0) {
      const tas = await User.find({ _id: { $in: assignedTAs }, role: 'ta' });
      if (tas.length !== assignedTAs.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found or do not have TA role'
        });
      }
    }

    // Check for duplicate offering
    const existing = await CourseOffering.findOne({
      courseId,
      academicTermId,
      programId,
      section: section || 'A'
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Course offering already exists for this term/program/section'
      });
    }

    const offering = await CourseOffering.create({
      courseId,
      academicTermId,
      programId,
      section: section || 'A',
      assignedTeacher,
      assignedTAs: assignedTAs || [],
      maxCapacity: maxCapacity || 50,
      schedule,
      isSummerRepeat: isSummerRepeat || false
    });

    const populated = await CourseOffering.findById(offering._id)
      .populate('courseId', 'courseCode courseName creditHours')
      .populate('academicTermId', 'name termType year')
      .populate('programId', 'name code')
      .populate('assignedTeacher', 'name email')
      .populate('assignedTAs', 'name email');

    res.status(201).json({
      success: true,
      message: 'Course offering created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Get all course offerings
 * @route   GET /api/course-offerings
 * @access  All authenticated users
 */
export const getCourseOfferings = async (req, res) => {
  try {
    const { academicTermId, programId, courseId, assignedTeacher, status, isSummerRepeat } = req.query;
    
    const filter = { isActive: true };
    if (academicTermId) filter.academicTermId = academicTermId;
    if (programId) filter.programId = programId;
    if (courseId) filter.courseId = courseId;
    if (assignedTeacher) filter.assignedTeacher = assignedTeacher;
    if (status) filter.status = status;
    if (isSummerRepeat !== undefined) filter.isSummerRepeat = isSummerRepeat === 'true';

    const offerings = await CourseOffering.find(filter)
      .populate('courseId', 'courseCode courseName creditHours')
      .populate('academicTermId', 'name termType year')
      .populate('programId', 'name code')
      .populate('assignedTeacher', 'name email')
      .populate('assignedTAs', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: offerings.length,
      data: offerings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course offerings',
      error: error.message
    });
  }
};

/**
 * @desc    Get single course offering
 * @route   GET /api/course-offerings/:id
 * @access  All authenticated users
 */
export const getCourseOffering = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id)
      .populate('courseId', 'courseCode courseName creditHours description')
      .populate('academicTermId', 'name termType year startDate endDate')
      .populate('programId', 'name code')
      .populate('assignedTeacher', 'name email')
      .populate('assignedTAs', 'name email');

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    res.status(200).json({
      success: true,
      data: offering
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Update course offering
 * @route   PUT /api/course-offerings/:id
 * @access  Admin, SuperAdmin, Teacher (limited)
 */
export const updateCourseOffering = async (req, res) => {
  try {
    const { section, assignedTeacher, assignedTAs, maxCapacity, schedule, status, isActive } = req.body;

    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Teachers can only update schedule
    if (req.user.role === 'teacher') {
      if (offering.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own course offerings'
        });
      }
      // Teachers can only update schedule
      if (section || assignedTeacher || assignedTAs || maxCapacity || status || isActive !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'Teachers can only update course schedule'
        });
      }
    }

    // Validate new teacher if being updated
    if (assignedTeacher) {
      const teacher = await User.findById(assignedTeacher);
      if (!teacher || !['teacher', 'admin', 'superadmin'].includes(teacher.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid teacher assignment'
        });
      }
    }

    // Validate TAs if being updated
    if (assignedTAs && assignedTAs.length > 0) {
      const tas = await User.find({ _id: { $in: assignedTAs }, role: 'ta' });
      if (tas.length !== assignedTAs.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found or do not have TA role'
        });
      }
    }

    const updated = await CourseOffering.findByIdAndUpdate(
      req.params.id,
      { section, assignedTeacher, assignedTAs, maxCapacity, schedule, status, isActive },
      { new: true, runValidators: true }
    )
      .populate('courseId', 'courseCode courseName creditHours')
      .populate('academicTermId', 'name termType year')
      .populate('programId', 'name code')
      .populate('assignedTeacher', 'name email')
      .populate('assignedTAs', 'name email');

    res.status(200).json({
      success: true,
      message: 'Course offering updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Assign TAs to course offering
 * @route   PUT /api/course-offerings/:id/assign-tas
 * @access  Admin, SuperAdmin
 */
export const assignTAs = async (req, res) => {
  try {
    const { taIds } = req.body;

    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Validate TAs
    if (taIds && taIds.length > 0) {
      const tas = await User.find({ _id: { $in: taIds }, role: 'ta' });
      if (tas.length !== taIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found or do not have TA role'
        });
      }
    }

    offering.assignedTAs = taIds || [];
    await offering.save();

    const updated = await CourseOffering.findById(offering._id)
      .populate('courseId', 'courseCode courseName')
      .populate('assignedTeacher', 'name email')
      .populate('assignedTAs', 'name email');

    res.status(200).json({
      success: true,
      message: 'TAs assigned successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning TAs',
      error: error.message
    });
  }
};

/**
 * @desc    Get teacher's assigned course offerings
 * @route   GET /api/course-offerings/teacher/:teacherId
 * @access  Teacher (own), Admin, SuperAdmin
 */
export const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;

    // Teachers can only view their own courses
    if (req.user.role === 'teacher' && req.user._id.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own assigned courses'
      });
    }

    const offerings = await CourseOffering.find({
      assignedTeacher: teacherId,
      isActive: true
    })
      .populate('courseId', 'courseCode courseName creditHours')
      .populate('academicTermId', 'name termType year isCurrent')
      .populate('programId', 'name code')
      .populate('assignedTAs', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: offerings.length,
      data: offerings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher courses',
      error: error.message
    });
  }
};

/**
 * @desc    Delete course offering
 * @route   DELETE /api/course-offerings/:id
 * @access  Admin, SuperAdmin
 */
export const deleteCourseOffering = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Check for existing enrollments
    const enrollmentCount = await Enrollment.countDocuments({ courseOfferingId: req.params.id });
    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete offering with existing enrollments'
      });
    }

    await CourseOffering.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Course offering deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting course offering',
      error: error.message
    });
  }
};
