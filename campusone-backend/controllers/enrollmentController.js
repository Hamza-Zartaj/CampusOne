import Enrollment from '../models/Enrollment.js';
import CourseOffering from '../models/CourseOffering.js';
import AcademicTerm from '../models/AcademicTerm.js';
import Curriculum from '../models/Curriculum.js';
import User from '../models/User.js';
import Program from '../models/Program.js';

/**
 * @desc    Enroll student in course offering
 * @route   POST /api/enrollments
 * @access  Admin, SuperAdmin
 */
export const enrollStudent = async (req, res) => {
  try {
    const { studentId, courseOfferingId, isRepeat, previousEnrollmentId } = req.body;

    // Validate student exists and has student role
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }

    // Get course offering with details
    const offering = await CourseOffering.findById(courseOfferingId)
      .populate('academicTermId')
      .populate('courseId');
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Check for duplicate enrollment
    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseOfferingId,
      status: 'enrolled'
    });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    // Check capacity
    if (offering.currentEnrollment >= offering.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Course offering is at full capacity'
      });
    }

    // Get student's program
    const studentProgram = student.programId;
    if (!studentProgram) {
      return res.status(400).json({
        success: false,
        message: 'Student is not assigned to any program'
      });
    }

    // Validate enrollment rules based on term type
    const term = offering.academicTermId;
    
    if (term.termType === 'summer') {
      // Summer: Only allow enrollment in previously failed courses
      if (!isRepeat) {
        // Check if student has failed this course before
        const hasFailed = await Enrollment.hasFailedCourse(studentId, offering.courseId._id);
        if (!hasFailed) {
          return res.status(400).json({
            success: false,
            message: 'Summer enrollment is only allowed for previously failed courses'
          });
        }
      }
    } else {
      // Regular term: Check curriculum eligibility
      if (!isRepeat) {
        // Get program to check curriculum rules
        const program = await Program.findById(studentProgram);
        const currentSemester = student.currentSemester || 1;

        // Find if this course is in curriculum for student's semester
        const curriculumEntry = await Curriculum.findOne({
          programId: studentProgram,
          courseId: offering.courseId._id,
          semesterNumber: currentSemester,
          isActive: true
        });

        // If not in current semester curriculum, check elective eligibility
        if (!curriculumEntry) {
          // Check if it's an elective for later semesters (allowed in semester 5+)
          if (currentSemester <= program.coreSemestersCount) {
            // In core semesters, can only enroll in core courses for that semester
            return res.status(400).json({
              success: false,
              message: 'This course is not in your current semester curriculum'
            });
          } else {
            // In elective semesters, check if course is an elective for this program
            const electiveEntry = await Curriculum.findOne({
              programId: studentProgram,
              courseId: offering.courseId._id,
              isElective: true,
              semesterNumber: { $lte: currentSemester },
              isActive: true
            });
            
            if (!electiveEntry) {
              return res.status(400).json({
                success: false,
                message: 'This course is not available for your program/semester'
              });
            }
          }
        }
      }
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      studentId,
      courseOfferingId,
      status: 'enrolled',
      isRepeat: isRepeat || false,
      previousEnrollmentId: isRepeat ? previousEnrollmentId : null,
      enrolledAt: new Date()
    });

    // Update offering enrollment count
    offering.currentEnrollment += 1;
    await offering.save();

    const populated = await Enrollment.findById(enrollment._id)
      .populate('studentId', 'name email studentId')
      .populate({
        path: 'courseOfferingId',
        populate: [
          { path: 'courseId', select: 'courseCode courseName' },
          { path: 'academicTermId', select: 'name' }
        ]
      });

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enrolling student',
      error: error.message
    });
  }
};

/**
 * @desc    Get all enrollments (with filters)
 * @route   GET /api/enrollments
 * @access  Admin, SuperAdmin
 */
export const getEnrollments = async (req, res) => {
  try {
    const { studentId, courseOfferingId, status, isRepeat } = req.query;
    
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (courseOfferingId) filter.courseOfferingId = courseOfferingId;
    if (status) filter.status = status;
    if (isRepeat !== undefined) filter.isRepeat = isRepeat === 'true';

    const enrollments = await Enrollment.find(filter)
      .populate('studentId', 'name email studentId')
      .populate({
        path: 'courseOfferingId',
        populate: [
          { path: 'courseId', select: 'courseCode courseName creditHours' },
          { path: 'academicTermId', select: 'name termType year' },
          { path: 'programId', select: 'name code' }
        ]
      })
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollments',
      error: error.message
    });
  }
};

/**
 * @desc    Get student's current semester courses
 * @route   GET /api/enrollments/student/:studentId/current
 * @access  Student (own), Admin, SuperAdmin
 */
export const getStudentCurrentCourses = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Students can only view their own enrollments
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own enrollments'
      });
    }

    // Get current term
    const currentTerm = await AcademicTerm.getCurrentTerm();
    if (!currentTerm) {
      return res.status(404).json({
        success: false,
        message: 'No current term is set'
      });
    }

    // Get offerings for current term
    const currentOfferings = await CourseOffering.find({
      academicTermId: currentTerm._id,
      isActive: true
    }).select('_id');

    const offeringIds = currentOfferings.map(o => o._id);

    // Get enrollments for current term
    const enrollments = await Enrollment.find({
      studentId,
      courseOfferingId: { $in: offeringIds },
      status: 'enrolled'
    })
      .populate({
        path: 'courseOfferingId',
        populate: [
          { path: 'courseId', select: 'courseCode courseName creditHours' },
          { path: 'academicTermId', select: 'name' },
          { path: 'assignedTeacher', select: 'name email' },
          { path: 'programId', select: 'name code' }
        ]
      });

    res.status(200).json({
      success: true,
      term: currentTerm.name,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student courses',
      error: error.message
    });
  }
};

/**
 * @desc    Get student's all enrollments
 * @route   GET /api/enrollments/student/:studentId
 * @access  Student (own), Admin, SuperAdmin
 */
export const getStudentEnrollments = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Students can only view their own enrollments
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own enrollments'
      });
    }

    const enrollments = await Enrollment.find({ studentId })
      .populate({
        path: 'courseOfferingId',
        populate: [
          { path: 'courseId', select: 'courseCode courseName creditHours' },
          { path: 'academicTermId', select: 'name termType year' },
          { path: 'programId', select: 'name code' }
        ]
      })
      .sort({ enrolledAt: -1 });

    // Group by status
    const grouped = {
      enrolled: enrollments.filter(e => e.status === 'enrolled'),
      completed: enrollments.filter(e => e.status === 'completed'),
      failed: enrollments.filter(e => e.status === 'failed'),
      withdrawn: enrollments.filter(e => e.status === 'withdrawn'),
      dropped: enrollments.filter(e => e.status === 'dropped')
    };

    res.status(200).json({
      success: true,
      totalCount: enrollments.length,
      data: grouped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student enrollments',
      error: error.message
    });
  }
};

/**
 * @desc    Update enrollment status
 * @route   PUT /api/enrollments/:id
 * @access  Admin, SuperAdmin
 */
export const updateEnrollment = async (req, res) => {
  try {
    const { status, withdrawalReason } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const previousStatus = enrollment.status;

    // Update status
    enrollment.status = status;
    if (status === 'withdrawn') {
      enrollment.withdrawalReason = withdrawalReason;
      enrollment.completedAt = new Date();
    } else if (['completed', 'failed', 'dropped'].includes(status)) {
      enrollment.completedAt = new Date();
    }

    await enrollment.save();

    // Update offering count if status changed from/to enrolled
    if (previousStatus === 'enrolled' && status !== 'enrolled') {
      await CourseOffering.findByIdAndUpdate(enrollment.courseOfferingId, {
        $inc: { currentEnrollment: -1 }
      });
    } else if (previousStatus !== 'enrolled' && status === 'enrolled') {
      await CourseOffering.findByIdAndUpdate(enrollment.courseOfferingId, {
        $inc: { currentEnrollment: 1 }
      });
    }

    const updated = await Enrollment.findById(enrollment._id)
      .populate('studentId', 'name email studentId')
      .populate({
        path: 'courseOfferingId',
        populate: [
          { path: 'courseId', select: 'courseCode courseName' },
          { path: 'academicTermId', select: 'name' }
        ]
      });

    res.status(200).json({
      success: true,
      message: 'Enrollment updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating enrollment',
      error: error.message
    });
  }
};

/**
 * @desc    Drop/Withdraw from course
 * @route   PUT /api/enrollments/:id/withdraw
 * @access  Student (own), Admin, SuperAdmin
 */
export const withdrawEnrollment = async (req, res) => {
  try {
    const { reason } = req.body;

    const enrollment = await Enrollment.findById(req.params.id)
      .populate({
        path: 'courseOfferingId',
        populate: { path: 'academicTermId' }
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Students can only withdraw from their own enrollments
    if (req.user.role === 'student' && enrollment.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only withdraw from your own courses'
      });
    }

    // Check if already completed/failed/withdrawn
    if (enrollment.status !== 'enrolled') {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw from enrollment with status: ${enrollment.status}`
      });
    }

    // Check withdrawal deadline
    const term = enrollment.courseOfferingId.academicTermId;
    if (term.withdrawalDeadline && new Date() > new Date(term.withdrawalDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal deadline has passed'
      });
    }

    enrollment.status = 'withdrawn';
    enrollment.withdrawalReason = reason;
    enrollment.completedAt = new Date();
    await enrollment.save();

    // Update offering count
    await CourseOffering.findByIdAndUpdate(enrollment.courseOfferingId._id, {
      $inc: { currentEnrollment: -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully withdrawn from course',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error withdrawing from course',
      error: error.message
    });
  }
};

/**
 * @desc    Get enrollments for a course offering
 * @route   GET /api/enrollments/offering/:offeringId
 * @access  Teacher (assigned), Admin, SuperAdmin
 */
export const getOfferingEnrollments = async (req, res) => {
  try {
    const offeringId = req.params.offeringId;

    // Check if user is assigned teacher (if teacher role)
    if (req.user.role === 'teacher') {
      const offering = await CourseOffering.findById(offeringId);
      if (!offering || offering.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view enrollments for your assigned courses'
        });
      }
    }

    const enrollments = await Enrollment.find({
      courseOfferingId: offeringId,
      status: 'enrolled'
    })
      .populate('studentId', 'name email studentId currentSemester')
      .sort({ enrolledAt: 1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching offering enrollments',
      error: error.message
    });
  }
};

/**
 * @desc    Delete enrollment
 * @route   DELETE /api/enrollments/:id
 * @access  Admin, SuperAdmin
 */
export const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Update offering count if was enrolled
    if (enrollment.status === 'enrolled') {
      await CourseOffering.findByIdAndUpdate(enrollment.courseOfferingId, {
        $inc: { currentEnrollment: -1 }
      });
    }

    await Enrollment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Enrollment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting enrollment',
      error: error.message
    });
  }
};
