import Enrollment from '../models/Enrollment.js';
import CourseOffering from '../models/CourseOffering.js';
import Course from '../models/Course.js';
import Student from '../models/Student.js';
import AuditLogger from '../services/auditLogger.js';

// Grade point mapping
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0,
  'F': 0.0,
  'I': null, 'W': null, 'P': null, 'NP': null
};

// Helper: Check if student has completed prerequisites
const checkPrerequisites = async (studentId, courseId) => {
  const course = await Course.findById(courseId).populate('prerequisites');
  
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return { satisfied: true, missing: [] };
  }

  // Get student's completed course offerings
  const completedEnrollments = await Enrollment.find({
    student: studentId,
    status: 'completed',
    grade: { $nin: ['F', 'W', 'I', 'NP'] }
  }).populate({
    path: 'courseOffering',
    select: 'course'
  });

  const completedCourseIds = completedEnrollments
    .filter(e => e.courseOffering && e.courseOffering.course)
    .map(e => e.courseOffering.course.toString());

  const missing = course.prerequisites.filter(
    prereq => !completedCourseIds.includes(prereq._id.toString())
  );

  return {
    satisfied: missing.length === 0,
    missing: missing.map(p => ({ id: p._id, code: p.courseCode, name: p.courseName }))
  };
};

// Helper: Check for duplicate enrollment
const checkDuplicateEnrollment = async (studentId, courseOfferingId) => {
  const existing = await Enrollment.findOne({
    student: studentId,
    courseOffering: courseOfferingId,
    status: { $nin: ['dropped', 'withdrawn'] }
  });
  return existing;
};

// Helper: Check if student already enrolled in same course (different offering)
const checkSameCourseEnrollment = async (studentId, courseId, academicYear, semesterNumber) => {
  const offerings = await CourseOffering.find({
    course: courseId,
    academicYear,
    semesterNumber
  }).select('_id');

  const offeringIds = offerings.map(o => o._id);

  const existing = await Enrollment.findOne({
    student: studentId,
    courseOffering: { $in: offeringIds },
    status: { $nin: ['dropped', 'withdrawn'] }
  });

  return existing;
};

// Helper: Get next waitlist position
const getNextWaitlistPosition = async (courseOfferingId) => {
  const lastWaitlisted = await Enrollment.findOne({
    courseOffering: courseOfferingId,
    status: 'waitlisted'
  }).sort({ waitlistPosition: -1 });

  return lastWaitlisted ? lastWaitlisted.waitlistPosition + 1 : 1;
};

// Helper: Promote from waitlist
const promoteFromWaitlist = async (courseOfferingId, count = 1) => {
  const waitlisted = await Enrollment.find({
    courseOffering: courseOfferingId,
    status: 'waitlisted'
  }).sort({ waitlistPosition: 1 }).limit(count);

  const promoted = [];
  for (const enrollment of waitlisted) {
    enrollment.status = 'enrolled';
    enrollment.waitlistPosition = undefined;
    enrollment.promotedFromWaitlistAt = new Date();
    enrollment.enrolledAt = new Date();
    await enrollment.save();
    promoted.push(enrollment);

    // Update course offering enrollment count
    await CourseOffering.findByIdAndUpdate(courseOfferingId, {
      $inc: { currentEnrollment: 1 }
    });
  }

  // Reorder remaining waitlist
  const remaining = await Enrollment.find({
    courseOffering: courseOfferingId,
    status: 'waitlisted'
  }).sort({ waitlistPosition: 1 });

  for (let i = 0; i < remaining.length; i++) {
    remaining[i].waitlistPosition = i + 1;
    await remaining[i].save();
  }

  return promoted;
};

// @desc    Enroll student in a course offering
// @route   POST /api/enrollments
// @access  Private
export const enrollStudent = async (req, res) => {
  try {
    const { studentId, courseOfferingId, enrollmentType = 'regular', forceEnroll = false } = req.body;

    // Get course offering with course details
    const courseOffering = await CourseOffering.findById(courseOfferingId)
      .populate('course')
      .populate('program');

    if (!courseOffering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Check if enrollment is open
    if (courseOffering.enrollmentStatus === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is closed for this course offering'
      });
    }

    // Check for duplicate enrollment in same offering
    const duplicate = await checkDuplicateEnrollment(studentId, courseOfferingId);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course offering',
        enrollment: duplicate
      });
    }

    // Check for enrollment in same course (different section)
    const sameCourse = await checkSameCourseEnrollment(
      studentId,
      courseOffering.course._id,
      courseOffering.academicYear,
      courseOffering.semesterNumber
    );
    if (sameCourse) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in another section of this course',
        enrollment: sameCourse
      });
    }

    // Check prerequisites (skip for audit or if forceEnroll)
    if (enrollmentType !== 'audit' && !forceEnroll) {
      const prereqCheck = await checkPrerequisites(studentId, courseOffering.course._id);
      if (!prereqCheck.satisfied) {
        return res.status(400).json({
          success: false,
          message: 'Prerequisites not satisfied',
          missingPrerequisites: prereqCheck.missing
        });
      }
    }

    // Check capacity
    const isAtCapacity = courseOffering.currentEnrollment >= courseOffering.maxCapacity;
    const shouldWaitlist = isAtCapacity && courseOffering.enrollmentStatus === 'waitlist';

    if (isAtCapacity && courseOffering.enrollmentStatus !== 'waitlist') {
      return res.status(400).json({
        success: false,
        message: 'Course offering is at full capacity and waitlist is not enabled'
      });
    }

    // Create enrollment
    const enrollmentData = {
      student: studentId,
      courseOffering: courseOfferingId,
      program: courseOffering.program._id,
      academicYear: courseOffering.academicYear,
      semesterNumber: courseOffering.semesterNumber,
      enrollmentType
    };

    if (shouldWaitlist) {
      enrollmentData.status = 'waitlisted';
      enrollmentData.waitlistPosition = await getNextWaitlistPosition(courseOfferingId);
      enrollmentData.waitlistAddedAt = new Date();
      enrollmentData.enrolledAt = undefined;
    } else {
      enrollmentData.status = 'enrolled';
      enrollmentData.enrolledAt = new Date();
    }

    const enrollment = await Enrollment.create(enrollmentData);

    // Update course offering enrollment count (only if not waitlisted)
    if (!shouldWaitlist) {
      await CourseOffering.findByIdAndUpdate(courseOfferingId, {
        $inc: { currentEnrollment: 1 }
      });
    }

    // Audit log for enrollment (especially force enrollments)
    if (forceEnroll) {
      await AuditLogger.logEnrollmentAction(
        'ENROLLMENT_FORCE_CREATED',
        req.user.id,
        enrollment._id,
        studentId,
        courseOfferingId,
        {
          enrollmentType,
          status: enrollmentData.status,
          waitlistPosition: enrollmentData.waitlistPosition,
          bypassedChecks: ['prerequisites', 'corequisites', 'capacity'],
          reason: 'Force enrollment requested by admin/registrar'
        }
      );
    }

    // Populate for response
    await enrollment.populate([
      { path: 'student', select: 'studentId userId', populate: { path: 'userId', select: 'firstName lastName email' } },
      { path: 'courseOffering', populate: { path: 'course', select: 'courseCode courseName creditHours' } },
      { path: 'program', select: 'programCode programName' }
    ]);

    res.status(201).json({
      success: true,
      data: enrollment,
      message: shouldWaitlist 
        ? `Added to waitlist at position ${enrollment.waitlistPosition}`
        : 'Successfully enrolled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enrolling student',
      error: error.message
    });
  }
};

// @desc    Drop enrollment
// @route   PUT /api/enrollments/:id/drop
// @access  Private
export const dropEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const enrollment = await Enrollment.findById(id)
      .populate('courseOffering');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (['dropped', 'withdrawn', 'completed'].includes(enrollment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot drop enrollment with status: ${enrollment.status}`
      });
    }

    const wasWaitlisted = enrollment.status === 'waitlisted';
    const courseOfferingId = enrollment.courseOffering._id;

    enrollment.status = 'dropped';
    enrollment.droppedAt = new Date();
    enrollment.dropReason = reason;
    enrollment.waitlistPosition = undefined;
    await enrollment.save();

    // Update course offering enrollment count (only if was actually enrolled)
    if (!wasWaitlisted) {
      await CourseOffering.findByIdAndUpdate(courseOfferingId, {
        $inc: { currentEnrollment: -1 }
      });

      // Promote someone from waitlist
      const promoted = await promoteFromWaitlist(courseOfferingId, 1);
      if (promoted.length > 0) {
        // TODO: Send notification to promoted student
      }
    } else {
      // Reorder waitlist
      const remaining = await Enrollment.find({
        courseOffering: courseOfferingId,
        status: 'waitlisted'
      }).sort({ waitlistPosition: 1 });

      for (let i = 0; i < remaining.length; i++) {
        remaining[i].waitlistPosition = i + 1;
        await remaining[i].save();
      }
    }

    // Audit log for enrollment drop
    await AuditLogger.logEnrollmentAction(
      'ENROLLMENT_DROPPED',
      req.user.id,
      enrollment._id,
      enrollment.student,
      courseOfferingId,
      {
        reason,
        wasWaitlisted,
        previousStatus: wasWaitlisted ? 'waitlisted' : 'enrolled'
      }
    );

    res.status(200).json({
      success: true,
      message: 'Enrollment dropped successfully',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error dropping enrollment',
      error: error.message
    });
  }
};

// @desc    Withdraw from enrollment (after deadline)
// @route   PUT /api/enrollments/:id/withdraw
// @access  Private
export const withdrawEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const enrollment = await Enrollment.findById(id)
      .populate('courseOffering');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (!['enrolled', 'active'].includes(enrollment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw enrollment with status: ${enrollment.status}`
      });
    }

    enrollment.status = 'withdrawn';
    enrollment.grade = 'W';
    enrollment.droppedAt = new Date();
    enrollment.dropReason = reason;
    await enrollment.save();

    // Update course offering enrollment count
    await CourseOffering.findByIdAndUpdate(enrollment.courseOffering._id, {
      $inc: { currentEnrollment: -1 }
    });

    // Promote from waitlist
    await promoteFromWaitlist(enrollment.courseOffering._id, 1);

    // Audit log for withdrawal
    await AuditLogger.logEnrollmentAction(
      'ENROLLMENT_WITHDRAWN',
      req.user.id,
      enrollment._id,
      enrollment.student,
      enrollment.courseOffering._id,
      {
        reason,
        gradeAssigned: 'W'
      }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully withdrawn from course',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error withdrawing from enrollment',
      error: error.message
    });
  }
};

// @desc    Get waitlist for a course offering
// @route   GET /api/enrollments/waitlist/:courseOfferingId
// @access  Private
export const getWaitlist = async (req, res) => {
  try {
    const { courseOfferingId } = req.params;

    const waitlist = await Enrollment.find({
      courseOffering: courseOfferingId,
      status: 'waitlisted'
    })
      .sort({ waitlistPosition: 1 })
      .populate({
        path: 'student',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'firstName lastName email' }
      });

    res.status(200).json({
      success: true,
      count: waitlist.length,
      data: waitlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching waitlist',
      error: error.message
    });
  }
};

// @desc    Get student's waitlist position
// @route   GET /api/enrollments/waitlist-position/:enrollmentId
// @access  Private
export const getWaitlistPosition = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.status !== 'waitlisted') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not on waitlist'
      });
    }

    const totalWaitlisted = await Enrollment.countDocuments({
      courseOffering: enrollment.courseOffering,
      status: 'waitlisted'
    });

    res.status(200).json({
      success: true,
      data: {
        position: enrollment.waitlistPosition,
        totalInWaitlist: totalWaitlisted
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching waitlist position',
      error: error.message
    });
  }
};

// @desc    Update enrollment grade
// @route   PUT /api/enrollments/:id/grade
// @access  Private (Teacher/Admin)
export const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, midtermMarks, finalMarks, assignmentMarks, quizMarks, labMarks, totalMarks, remarks } = req.body;

    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (!['enrolled', 'active'].includes(enrollment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update grade for enrollment with status: ${enrollment.status}`
      });
    }

    // Update marks
    if (midtermMarks !== undefined) enrollment.midtermMarks = midtermMarks;
    if (finalMarks !== undefined) enrollment.finalMarks = finalMarks;
    if (assignmentMarks !== undefined) enrollment.assignmentMarks = assignmentMarks;
    if (quizMarks !== undefined) enrollment.quizMarks = quizMarks;
    if (labMarks !== undefined) enrollment.labMarks = labMarks;
    if (totalMarks !== undefined) enrollment.totalMarks = totalMarks;
    if (remarks !== undefined) enrollment.remarks = remarks;

    // Update grade
    if (grade) {
      enrollment.grade = grade;
      enrollment.gradePoints = GRADE_POINTS[grade];
      
      // Mark as completed if passing grade
      if (grade !== 'I' && grade !== 'W') {
        enrollment.status = grade === 'F' ? 'failed' : 'completed';
        enrollment.completedAt = new Date();
      }
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: 'Grade updated successfully',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating grade',
      error: error.message
    });
  }
};

// @desc    Get student transcript
// @route   GET /api/enrollments/transcript/:studentId
// @access  Private
export const getTranscript = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .populate({
        path: 'userId',
        select: 'firstName lastName email'
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all completed/graded enrollments
    const enrollments = await Enrollment.find({
      student: studentId,
      status: { $in: ['completed', 'failed', 'withdrawn'] }
    })
      .populate({
        path: 'courseOffering',
        select: 'course academicYear semesterNumber section',
        populate: {
          path: 'course',
          select: 'courseCode courseName creditHours courseType domain'
        }
      })
      .populate('program', 'programCode programName')
      .sort({ academicYear: 1, semesterNumber: 1 });

    // Group by semester
    const semesters = {};
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;
    let totalGradePoints = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.courseOffering || !enrollment.courseOffering.course) continue;

      const key = `${enrollment.academicYear}-S${enrollment.semesterNumber}`;
      const creditHours = enrollment.courseOffering.course.creditHours;

      if (!semesters[key]) {
        semesters[key] = {
          academicYear: enrollment.academicYear,
          semesterNumber: enrollment.semesterNumber,
          courses: [],
          semesterCreditsAttempted: 0,
          semesterCreditsEarned: 0,
          semesterGradePoints: 0,
          semesterGPA: 0
        };
      }

      const course = {
        courseCode: enrollment.courseOffering.course.courseCode,
        courseName: enrollment.courseOffering.course.courseName,
        creditHours: creditHours,
        grade: enrollment.grade,
        gradePoints: enrollment.gradePoints,
        status: enrollment.status,
        section: enrollment.courseOffering.section,
        enrollmentType: enrollment.enrollmentType
      };

      semesters[key].courses.push(course);

      // Calculate credits (exclude W, I, P, NP from GPA calculation)
      if (!['W', 'I', 'P', 'NP'].includes(enrollment.grade)) {
        semesters[key].semesterCreditsAttempted += creditHours;
        totalCreditsAttempted += creditHours;

        if (enrollment.gradePoints !== null && enrollment.gradePoints !== undefined) {
          semesters[key].semesterGradePoints += enrollment.gradePoints * creditHours;
          totalGradePoints += enrollment.gradePoints * creditHours;

          // Earned credits (passing grade)
          if (enrollment.grade !== 'F') {
            semesters[key].semesterCreditsEarned += creditHours;
            totalCreditsEarned += creditHours;
          }
        }
      }
    }

    // Calculate semester GPAs
    const semesterList = Object.values(semesters).map(sem => {
      sem.semesterGPA = sem.semesterCreditsAttempted > 0 
        ? Math.round((sem.semesterGradePoints / sem.semesterCreditsAttempted) * 100) / 100
        : 0;
      return sem;
    }).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      return a.semesterNumber - b.semesterNumber;
    });

    // Calculate CGPA
    const cgpa = totalCreditsAttempted > 0 
      ? Math.round((totalGradePoints / totalCreditsAttempted) * 100) / 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          name: `${student.userId.firstName} ${student.userId.lastName}`,
          email: student.userId.email,
          enrollmentYear: student.enrollmentYear,
          department: student.department,
          batch: student.batch,
          currentSemester: student.currentSemester
        },
        semesters: semesterList,
        summary: {
          totalCreditsAttempted,
          totalCreditsEarned,
          totalGradePoints: Math.round(totalGradePoints * 100) / 100,
          cgpa
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating transcript',
      error: error.message
    });
  }
};

// @desc    Calculate CGPA for a student
// @route   GET /api/enrollments/cgpa/:studentId
// @access  Private
export const calculateCGPA = async (req, res) => {
  try {
    const { studentId } = req.params;

    const enrollments = await Enrollment.find({
      student: studentId,
      status: { $in: ['completed', 'failed'] },
      grade: { $nin: ['W', 'I', 'P', 'NP'] }
    }).populate({
      path: 'courseOffering',
      select: 'course',
      populate: {
        path: 'course',
        select: 'creditHours'
      }
    });

    let totalCredits = 0;
    let totalGradePoints = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.courseOffering || !enrollment.courseOffering.course) continue;
      
      const creditHours = enrollment.courseOffering.course.creditHours;
      const gradePoints = enrollment.gradePoints || 0;

      totalCredits += creditHours;
      totalGradePoints += gradePoints * creditHours;
    }

    const cgpa = totalCredits > 0 
      ? Math.round((totalGradePoints / totalCredits) * 100) / 100
      : 0;

    // Update student record
    await Student.findByIdAndUpdate(studentId, {
      cgpa,
      totalCredits
    });

    res.status(200).json({
      success: true,
      data: {
        totalCredits,
        totalGradePoints: Math.round(totalGradePoints * 100) / 100,
        cgpa
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating CGPA',
      error: error.message
    });
  }
};

// @desc    Get all enrollments with pagination
// @route   GET /api/enrollments
// @access  Private
export const getEnrollments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      student,
      courseOffering,
      program,
      academicYear,
      semesterNumber,
      status,
      enrollmentType,
      includeDeleted
    } = req.query;

    const query = {};

    if (student) query.student = student;
    if (courseOffering) query.courseOffering = courseOffering;
    if (program) query.program = program;
    if (academicYear) query.academicYear = academicYear;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber);
    if (status) query.status = status;
    if (enrollmentType) query.enrollmentType = enrollmentType;

    const options = {};
    if (includeDeleted === 'true') options.includeSoftDeleted = true;

    const total = await Enrollment.countDocuments(query).setOptions(options);
    const enrollments = await Enrollment.find(query)
      .setOptions(options)
      .populate({
        path: 'student',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'firstName lastName email' }
      })
      .populate({
        path: 'courseOffering',
        select: 'course section academicYear semesterNumber',
        populate: { path: 'course', select: 'courseCode courseName creditHours' }
      })
      .populate('program', 'programCode programName')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      data: enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollments',
      error: error.message
    });
  }
};

// @desc    Get single enrollment
// @route   GET /api/enrollments/:id
// @access  Private
export const getEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate({
        path: 'student',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'firstName lastName email' }
      })
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'courseCode courseName creditHours prerequisites' },
          { path: 'teacher', select: 'userId', populate: { path: 'userId', select: 'firstName lastName' } }
        ]
      })
      .populate('program', 'programCode programName');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollment',
      error: error.message
    });
  }
};

// @desc    Get enrollments by student
// @route   GET /api/enrollments/student/:studentId
// @access  Private
export const getStudentEnrollments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semesterNumber, status } = req.query;

    const query = { student: studentId };
    if (academicYear) query.academicYear = academicYear;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber);
    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'courseCode courseName creditHours courseType' },
          { path: 'teacher', select: 'userId', populate: { path: 'userId', select: 'firstName lastName' } }
        ]
      })
      .populate('program', 'programCode programName')
      .sort({ academicYear: -1, semesterNumber: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student enrollments',
      error: error.message
    });
  }
};

// @desc    Get enrollments for a course offering
// @route   GET /api/enrollments/offering/:courseOfferingId
// @access  Private
export const getCourseOfferingEnrollments = async (req, res) => {
  try {
    const { courseOfferingId } = req.params;
    const { status } = req.query;

    const query = { courseOffering: courseOfferingId };
    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'student',
        select: 'studentId userId batch currentSemester',
        populate: { path: 'userId', select: 'firstName lastName email' }
      })
      .sort({ enrolledAt: 1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course offering enrollments',
      error: error.message
    });
  }
};

// @desc    Bulk enroll students
// @route   POST /api/enrollments/bulk
// @access  Private (Admin)
export const bulkEnroll = async (req, res) => {
  try {
    const { studentIds, courseOfferingId, enrollmentType = 'regular', skipPrerequisites = false } = req.body;

    const courseOffering = await CourseOffering.findById(courseOfferingId)
      .populate('course')
      .populate('program');

    if (!courseOffering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const studentId of studentIds) {
      try {
        // Check duplicate
        const duplicate = await checkDuplicateEnrollment(studentId, courseOfferingId);
        if (duplicate) {
          results.failed.push({ studentId, reason: 'Already enrolled' });
          continue;
        }

        // Check prerequisites
        if (!skipPrerequisites && enrollmentType !== 'audit') {
          const prereqCheck = await checkPrerequisites(studentId, courseOffering.course._id);
          if (!prereqCheck.satisfied) {
            results.failed.push({ 
              studentId, 
              reason: 'Prerequisites not satisfied',
              missingPrerequisites: prereqCheck.missing
            });
            continue;
          }
        }

        // Check capacity
        const currentCount = await Enrollment.countDocuments({
          courseOffering: courseOfferingId,
          status: { $in: ['enrolled', 'active'] }
        });

        if (currentCount >= courseOffering.maxCapacity) {
          results.failed.push({ studentId, reason: 'Course at full capacity' });
          continue;
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
          student: studentId,
          courseOffering: courseOfferingId,
          program: courseOffering.program._id,
          academicYear: courseOffering.academicYear,
          semesterNumber: courseOffering.semesterNumber,
          enrollmentType,
          status: 'enrolled',
          enrolledAt: new Date()
        });

        // Update course offering count
        await CourseOffering.findByIdAndUpdate(courseOfferingId, {
          $inc: { currentEnrollment: 1 }
        });

        results.successful.push({ studentId, enrollmentId: enrollment._id });
      } catch (error) {
        results.failed.push({ studentId, reason: error.message });
      }
    }

    // Audit log for bulk enrollment
    if (results.successful.length > 0) {
      await AuditLogger.logBulkEnrollment(
        skipPrerequisites ? 'ENROLLMENT_FORCE_CREATED' : 'ENROLLMENT_CREATED',
        req.user.id,
        results.successful.map(s => s.enrollmentId),
        results.successful.map(s => s.studentId),
        courseOfferingId,
        {
          enrollmentType,
          skipPrerequisites,
          totalAttempted: studentIds.length,
          successCount: results.successful.length,
          failedCount: results.failed.length
        }
      );
    }

    res.status(200).json({
      success: true,
      data: results,
      summary: {
        total: studentIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in bulk enrollment',
      error: error.message
    });
  }
};

// @desc    Soft delete enrollment
// @route   DELETE /api/enrollments/:id
// @access  Private (Admin)
export const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Update course offering count if was enrolled
    if (['enrolled', 'active'].includes(enrollment.status)) {
      await CourseOffering.findByIdAndUpdate(enrollment.courseOffering, {
        $inc: { currentEnrollment: -1 }
      });
    }

    await enrollment.softDelete(req.user._id);

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

// @desc    Restore soft-deleted enrollment
// @route   PUT /api/enrollments/:id/restore
// @access  Private (Admin)
export const restoreEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .setOptions({ includeSoftDeleted: true });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (!enrollment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not deleted'
      });
    }

    await enrollment.restore();

    // Update course offering count if was enrolled
    if (['enrolled', 'active'].includes(enrollment.status)) {
      await CourseOffering.findByIdAndUpdate(enrollment.courseOffering, {
        $inc: { currentEnrollment: 1 }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Enrollment restored successfully',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error restoring enrollment',
      error: error.message
    });
  }
};

// @desc    Activate enrollment (mark as actively attending)
// @route   PUT /api/enrollments/:id/activate
// @access  Private
export const activateEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.status !== 'enrolled') {
      return res.status(400).json({
        success: false,
        message: `Cannot activate enrollment with status: ${enrollment.status}`
      });
    }

    enrollment.status = 'active';
    await enrollment.save();

    res.status(200).json({
      success: true,
      message: 'Enrollment activated',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating enrollment',
      error: error.message
    });
  }
};

// @desc    Check prerequisites for enrollment
// @route   GET /api/enrollments/check-prerequisites
// @access  Private
export const checkPrerequisitesEndpoint = async (req, res) => {
  try {
    const { studentId, courseId } = req.query;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide studentId and courseId'
      });
    }

    const result = await checkPrerequisites(studentId, courseId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking prerequisites',
      error: error.message
    });
  }
};

// @desc    Get semester summary (GPA, credits)
// @route   GET /api/enrollments/semester-summary/:studentId/:academicYear/:semesterNumber
// @access  Private
export const getSemesterSummary = async (req, res) => {
  try {
    const { studentId, academicYear, semesterNumber } = req.params;

    const enrollments = await Enrollment.find({
      student: studentId,
      academicYear,
      semesterNumber: parseInt(semesterNumber),
      status: { $in: ['completed', 'failed'] }
    }).populate({
      path: 'courseOffering',
      select: 'course',
      populate: {
        path: 'course',
        select: 'courseCode courseName creditHours'
      }
    });

    let creditsAttempted = 0;
    let creditsEarned = 0;
    let gradePoints = 0;

    const courses = enrollments
      .filter(e => e.courseOffering && e.courseOffering.course)
      .map(enrollment => {
        const creditHours = enrollment.courseOffering.course.creditHours;

        if (!['W', 'I', 'P', 'NP'].includes(enrollment.grade)) {
          creditsAttempted += creditHours;
          gradePoints += (enrollment.gradePoints || 0) * creditHours;

          if (enrollment.grade !== 'F') {
            creditsEarned += creditHours;
          }
        }

        return {
          courseCode: enrollment.courseOffering.course.courseCode,
          courseName: enrollment.courseOffering.course.courseName,
          creditHours,
          grade: enrollment.grade,
          gradePoints: enrollment.gradePoints,
          status: enrollment.status
        };
      });

    const gpa = creditsAttempted > 0
      ? Math.round((gradePoints / creditsAttempted) * 100) / 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        courses,
        summary: {
          creditsAttempted,
          creditsEarned,
          gradePoints: Math.round(gradePoints * 100) / 100,
          gpa
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching semester summary',
      error: error.message
    });
  }
};
