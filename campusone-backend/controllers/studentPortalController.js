import Enrollment from '../models/Enrollment.js';
import CourseOffering from '../models/CourseOffering.js';
import Course from '../models/Course.js';
import Student from '../models/Student.js';
import Program from '../models/Program.js';

// Grade point mapping
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0,
  'F': 0.0,
  'I': null, 'W': null, 'P': null, 'NP': null
};

// Helper: Get student from user
const getStudentFromUser = async (userId) => {
  const student = await Student.findOne({ userId });
  return student;
};

// Helper: Check if student has completed prerequisites
const checkPrerequisites = async (studentId, courseId) => {
  const course = await Course.findById(courseId).populate('prerequisites');
  
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return { satisfied: true, missing: [] };
  }

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

// Helper: Check if already enrolled in same course (different section)
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
const promoteFromWaitlist = async (courseOfferingId) => {
  const waitlisted = await Enrollment.findOne({
    courseOffering: courseOfferingId,
    status: 'waitlisted'
  }).sort({ waitlistPosition: 1 });

  if (waitlisted) {
    waitlisted.status = 'enrolled';
    waitlisted.waitlistPosition = undefined;
    waitlisted.promotedFromWaitlistAt = new Date();
    waitlisted.enrolledAt = new Date();
    await waitlisted.save();

    await CourseOffering.findByIdAndUpdate(courseOfferingId, {
      $inc: { currentEnrollment: 1 }
    });

    // Reorder remaining waitlist
    const remaining = await Enrollment.find({
      courseOffering: courseOfferingId,
      status: 'waitlisted'
    }).sort({ waitlistPosition: 1 });

    for (let i = 0; i < remaining.length; i++) {
      remaining[i].waitlistPosition = i + 1;
      await remaining[i].save();
    }

    return waitlisted;
  }
  return null;
};

// @desc    Get my profile (student)
// @route   GET /api/student/profile
// @access  Private (Student)
export const getMyProfile = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    await student.populate({
      path: 'userId',
      select: 'firstName lastName email'
    });

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// @desc    Get my current semester courses
// @route   GET /api/student/current-courses
// @access  Private (Student)
export const getCurrentCourses = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { academicYear, semesterNumber } = req.query;

    const query = {
      student: student._id,
      status: { $in: ['enrolled', 'active', 'waitlisted'] }
    };

    if (academicYear) query.academicYear = academicYear;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber);

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'courseCode courseName creditHours courseType description' },
          { path: 'teacher', select: 'userId', populate: { path: 'userId', select: 'firstName lastName email' } },
          { path: 'program', select: 'programCode programName' }
        ]
      })
      .sort({ enrolledAt: -1 });

    const courses = enrollments.map(enrollment => ({
      enrollmentId: enrollment._id,
      status: enrollment.status,
      waitlistPosition: enrollment.waitlistPosition,
      enrolledAt: enrollment.enrolledAt,
      enrollmentType: enrollment.enrollmentType,
      course: enrollment.courseOffering?.course,
      offering: {
        id: enrollment.courseOffering?._id,
        section: enrollment.courseOffering?.section,
        academicYear: enrollment.courseOffering?.academicYear,
        semesterNumber: enrollment.courseOffering?.semesterNumber,
        schedule: enrollment.courseOffering?.schedule,
        teacher: enrollment.courseOffering?.teacher?.userId
          ? `${enrollment.courseOffering.teacher.userId.firstName} ${enrollment.courseOffering.teacher.userId.lastName}`
          : null,
        teacherEmail: enrollment.courseOffering?.teacher?.userId?.email
      },
      // Current marks if available
      marks: {
        midterm: enrollment.midtermMarks,
        final: enrollment.finalMarks,
        assignment: enrollment.assignmentMarks,
        quiz: enrollment.quizMarks,
        lab: enrollment.labMarks,
        total: enrollment.totalMarks
      }
    }));

    // Calculate total credits
    const totalCredits = courses
      .filter(c => c.status !== 'waitlisted')
      .reduce((sum, c) => sum + (c.course?.creditHours || 0), 0);

    res.status(200).json({
      success: true,
      count: courses.length,
      totalCredits,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching current courses',
      error: error.message
    });
  }
};

// @desc    Get available course offerings for enrollment
// @route   GET /api/student/available-offerings
// @access  Private (Student)
export const getAvailableOfferings = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { academicYear, semesterNumber, program, showAll = false } = req.query;

    if (!academicYear || !semesterNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide academicYear and semesterNumber'
      });
    }

    // Build query
    const query = {
      academicYear,
      semesterNumber: parseInt(semesterNumber),
      enrollmentStatus: { $in: ['open', 'waitlist'] },
      isActive: true
    };

    if (program) query.program = program;

    const offerings = await CourseOffering.find(query)
      .populate('course', 'courseCode courseName creditHours courseType prerequisites description')
      .populate('program', 'programCode programName')
      .populate({
        path: 'teacher',
        select: 'userId',
        populate: { path: 'userId', select: 'firstName lastName' }
      })
      .sort({ 'course.courseCode': 1 });

    // Get student's current enrollments for this semester
    const currentEnrollments = await Enrollment.find({
      student: student._id,
      academicYear,
      semesterNumber: parseInt(semesterNumber),
      status: { $nin: ['dropped', 'withdrawn'] }
    }).populate({
      path: 'courseOffering',
      select: 'course'
    });

    const enrolledCourseIds = currentEnrollments
      .filter(e => e.courseOffering)
      .map(e => e.courseOffering.course.toString());

    const enrolledOfferingIds = currentEnrollments.map(e => e.courseOffering?._id.toString());

    // Process offerings
    const processedOfferings = await Promise.all(offerings.map(async (offering) => {
      const courseId = offering.course._id.toString();
      const offeringId = offering._id.toString();

      // Check enrollment status
      const isEnrolledInOffering = enrolledOfferingIds.includes(offeringId);
      const isEnrolledInCourse = enrolledCourseIds.includes(courseId);

      // Check prerequisites
      let prereqStatus = { satisfied: true, missing: [] };
      if (offering.course.prerequisites && offering.course.prerequisites.length > 0) {
        prereqStatus = await checkPrerequisites(student._id, courseId);
      }

      // Check capacity
      const hasCapacity = offering.currentEnrollment < offering.maxCapacity;
      const canWaitlist = offering.enrollmentStatus === 'waitlist' && !hasCapacity;

      return {
        offeringId: offering._id,
        course: {
          id: offering.course._id,
          code: offering.course.courseCode,
          name: offering.course.courseName,
          creditHours: offering.course.creditHours,
          type: offering.course.courseType,
          description: offering.course.description,
          hasPrerequisites: (offering.course.prerequisites?.length || 0) > 0
        },
        program: {
          id: offering.program?._id,
          code: offering.program?.programCode,
          name: offering.program?.programName
        },
        section: offering.section,
        teacher: offering.teacher?.userId
          ? `${offering.teacher.userId.firstName} ${offering.teacher.userId.lastName}`
          : null,
        schedule: offering.schedule,
        capacity: {
          max: offering.maxCapacity,
          current: offering.currentEnrollment,
          available: offering.maxCapacity - offering.currentEnrollment
        },
        enrollmentStatus: offering.enrollmentStatus,
        // Student-specific status
        canEnroll: !isEnrolledInCourse && prereqStatus.satisfied && (hasCapacity || canWaitlist),
        alreadyEnrolled: isEnrolledInOffering,
        enrolledInOtherSection: isEnrolledInCourse && !isEnrolledInOffering,
        prerequisites: prereqStatus,
        willWaitlist: !hasCapacity && canWaitlist
      };
    }));

    // Filter based on showAll
    const filteredOfferings = showAll === 'true' 
      ? processedOfferings 
      : processedOfferings.filter(o => o.canEnroll || o.alreadyEnrolled);

    res.status(200).json({
      success: true,
      count: filteredOfferings.length,
      data: filteredOfferings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available offerings',
      error: error.message
    });
  }
};

// @desc    Enroll in a course offering
// @route   POST /api/student/enroll
// @access  Private (Student)
export const enrollInCourse = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { courseOfferingId, enrollmentType = 'regular' } = req.body;

    // Get course offering
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
        message: 'Enrollment is closed for this course'
      });
    }

    // Check for duplicate enrollment
    const duplicate = await checkDuplicateEnrollment(student._id, courseOfferingId);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course offering'
      });
    }

    // Check for enrollment in same course (different section)
    const sameCourse = await checkSameCourseEnrollment(
      student._id,
      courseOffering.course._id,
      courseOffering.academicYear,
      courseOffering.semesterNumber
    );
    if (sameCourse) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in another section of this course'
      });
    }

    // Check prerequisites (skip for audit)
    if (enrollmentType !== 'audit') {
      const prereqCheck = await checkPrerequisites(student._id, courseOffering.course._id);
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
        message: 'Course is at full capacity'
      });
    }

    // Create enrollment
    const enrollmentData = {
      student: student._id,
      courseOffering: courseOfferingId,
      program: courseOffering.program?._id,
      academicYear: courseOffering.academicYear,
      semesterNumber: courseOffering.semesterNumber,
      enrollmentType
    };

    if (shouldWaitlist) {
      enrollmentData.status = 'waitlisted';
      enrollmentData.waitlistPosition = await getNextWaitlistPosition(courseOfferingId);
      enrollmentData.waitlistAddedAt = new Date();
    } else {
      enrollmentData.status = 'enrolled';
      enrollmentData.enrolledAt = new Date();
    }

    const enrollment = await Enrollment.create(enrollmentData);

    // Update course offering count
    if (!shouldWaitlist) {
      await CourseOffering.findByIdAndUpdate(courseOfferingId, {
        $inc: { currentEnrollment: 1 }
      });
    }

    // Populate for response
    await enrollment.populate({
      path: 'courseOffering',
      populate: { path: 'course', select: 'courseCode courseName creditHours' }
    });

    res.status(201).json({
      success: true,
      message: shouldWaitlist
        ? `Added to waitlist at position ${enrollment.waitlistPosition}`
        : 'Successfully enrolled',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enrolling in course',
      error: error.message
    });
  }
};

// @desc    Drop a course
// @route   PUT /api/student/drop/:enrollmentId
// @access  Private (Student)
export const dropCourse = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { enrollmentId } = req.params;
    const { reason } = req.body;

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: student._id
    }).populate('courseOffering');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (['dropped', 'withdrawn', 'completed', 'failed'].includes(enrollment.status)) {
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

    // Update course offering count
    if (!wasWaitlisted) {
      await CourseOffering.findByIdAndUpdate(courseOfferingId, {
        $inc: { currentEnrollment: -1 }
      });

      // Promote from waitlist
      await promoteFromWaitlist(courseOfferingId);
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

    res.status(200).json({
      success: true,
      message: 'Course dropped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error dropping course',
      error: error.message
    });
  }
};

// @desc    Swap course section
// @route   PUT /api/student/swap
// @access  Private (Student)
export const swapSection = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { currentEnrollmentId, newOfferingId } = req.body;

    // Get current enrollment
    const currentEnrollment = await Enrollment.findOne({
      _id: currentEnrollmentId,
      student: student._id,
      status: { $in: ['enrolled', 'active'] }
    }).populate('courseOffering');

    if (!currentEnrollment) {
      return res.status(404).json({
        success: false,
        message: 'Current enrollment not found or not active'
      });
    }

    // Get new offering
    const newOffering = await CourseOffering.findById(newOfferingId)
      .populate('course');

    if (!newOffering) {
      return res.status(404).json({
        success: false,
        message: 'New course offering not found'
      });
    }

    // Verify same course
    if (currentEnrollment.courseOffering.course.toString() !== newOffering.course._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Can only swap between sections of the same course'
      });
    }

    // Check if already enrolled in new offering
    const existingInNew = await Enrollment.findOne({
      student: student._id,
      courseOffering: newOfferingId,
      status: { $nin: ['dropped', 'withdrawn'] }
    });

    if (existingInNew) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in the target section'
      });
    }

    // Check capacity in new offering
    if (newOffering.currentEnrollment >= newOffering.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Target section is at full capacity'
      });
    }

    // Check if new offering allows enrollment
    if (newOffering.enrollmentStatus === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is closed for target section'
      });
    }

    // Perform swap
    const oldOfferingId = currentEnrollment.courseOffering._id;

    // Drop from current
    currentEnrollment.status = 'dropped';
    currentEnrollment.droppedAt = new Date();
    currentEnrollment.dropReason = `Swapped to section ${newOffering.section}`;
    await currentEnrollment.save();

    // Update old offering count
    await CourseOffering.findByIdAndUpdate(oldOfferingId, {
      $inc: { currentEnrollment: -1 }
    });

    // Create new enrollment
    const newEnrollment = await Enrollment.create({
      student: student._id,
      courseOffering: newOfferingId,
      program: newOffering.program,
      academicYear: newOffering.academicYear,
      semesterNumber: newOffering.semesterNumber,
      enrollmentType: currentEnrollment.enrollmentType,
      status: 'enrolled',
      enrolledAt: new Date()
    });

    // Update new offering count
    await CourseOffering.findByIdAndUpdate(newOfferingId, {
      $inc: { currentEnrollment: 1 }
    });

    // Promote from waitlist for old offering
    await promoteFromWaitlist(oldOfferingId);

    // Populate for response
    await newEnrollment.populate({
      path: 'courseOffering',
      populate: { path: 'course', select: 'courseCode courseName' }
    });

    res.status(200).json({
      success: true,
      message: `Successfully swapped to section ${newOffering.section}`,
      data: {
        previousSection: currentEnrollment.courseOffering.section,
        newSection: newOffering.section,
        enrollment: newEnrollment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error swapping section',
      error: error.message
    });
  }
};

// @desc    Get my timetable
// @route   GET /api/student/timetable
// @access  Private (Student)
export const getMyTimetable = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { academicYear, semesterNumber } = req.query;

    const query = {
      student: student._id,
      status: { $in: ['enrolled', 'active'] }
    };

    if (academicYear) query.academicYear = academicYear;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber);

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'courseCode courseName creditHours courseType' },
          { path: 'teacher', select: 'userId', populate: { path: 'userId', select: 'firstName lastName' } }
        ]
      });

    // Build timetable structure
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timetable = {};
    
    days.forEach(day => {
      timetable[day] = [];
    });

    for (const enrollment of enrollments) {
      if (!enrollment.courseOffering || !enrollment.courseOffering.schedule) continue;

      for (const slot of enrollment.courseOffering.schedule) {
        if (slot.day && timetable[slot.day]) {
          timetable[slot.day].push({
            courseCode: enrollment.courseOffering.course.courseCode,
            courseName: enrollment.courseOffering.course.courseName,
            section: enrollment.courseOffering.section,
            type: slot.type,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
            teacher: enrollment.courseOffering.teacher?.userId
              ? `${enrollment.courseOffering.teacher.userId.firstName} ${enrollment.courseOffering.teacher.userId.lastName}`
              : null
          });
        }
      }
    }

    // Sort each day by start time
    for (const day in timetable) {
      timetable[day].sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
    }

    res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching timetable',
      error: error.message
    });
  }
};

// @desc    Get my grades
// @route   GET /api/student/grades
// @access  Private (Student)
export const getMyGrades = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { academicYear, semesterNumber } = req.query;

    const query = {
      student: student._id
    };

    if (academicYear) query.academicYear = academicYear;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber);

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'courseCode courseName creditHours courseType' },
          { path: 'program', select: 'programCode programName' }
        ]
      })
      .sort({ academicYear: -1, semesterNumber: -1 });

    const grades = enrollments
      .filter(e => e.courseOffering && e.courseOffering.course)
      .map(enrollment => ({
        enrollmentId: enrollment._id,
        academicYear: enrollment.academicYear,
        semesterNumber: enrollment.semesterNumber,
        course: {
          code: enrollment.courseOffering.course.courseCode,
          name: enrollment.courseOffering.course.courseName,
          creditHours: enrollment.courseOffering.course.creditHours,
          type: enrollment.courseOffering.course.courseType
        },
        section: enrollment.courseOffering.section,
        enrollmentType: enrollment.enrollmentType,
        status: enrollment.status,
        marks: {
          midterm: enrollment.midtermMarks,
          final: enrollment.finalMarks,
          assignment: enrollment.assignmentMarks,
          quiz: enrollment.quizMarks,
          lab: enrollment.labMarks,
          total: enrollment.totalMarks
        },
        grade: enrollment.grade,
        gradePoints: enrollment.gradePoints,
        completedAt: enrollment.completedAt
      }));

    res.status(200).json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching grades',
      error: error.message
    });
  }
};

// @desc    Get my transcript
// @route   GET /api/student/transcript
// @access  Private (Student)
export const getMyTranscript = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    await student.populate({
      path: 'userId',
      select: 'firstName lastName email'
    });

    // Get all completed/graded enrollments
    const enrollments = await Enrollment.find({
      student: student._id,
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

      // Calculate credits (exclude W, I, P, NP)
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

// @desc    Get my CGPA
// @route   GET /api/student/cgpa
// @access  Private (Student)
export const getMyCGPA = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const enrollments = await Enrollment.find({
      student: student._id,
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
    student.cgpa = cgpa;
    student.totalCredits = totalCredits;
    await student.save();

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

// @desc    Get my waitlist positions
// @route   GET /api/student/waitlist
// @access  Private (Student)
export const getMyWaitlist = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const waitlisted = await Enrollment.find({
      student: student._id,
      status: 'waitlisted'
    })
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'courseCode courseName creditHours' },
          { path: 'teacher', select: 'userId', populate: { path: 'userId', select: 'firstName lastName' } }
        ]
      })
      .sort({ waitlistAddedAt: 1 });

    const waitlist = await Promise.all(waitlisted.map(async (enrollment) => {
      // Get total in waitlist for this offering
      const totalWaitlisted = await Enrollment.countDocuments({
        courseOffering: enrollment.courseOffering._id,
        status: 'waitlisted'
      });

      return {
        enrollmentId: enrollment._id,
        position: enrollment.waitlistPosition,
        totalInWaitlist: totalWaitlisted,
        addedAt: enrollment.waitlistAddedAt,
        course: {
          code: enrollment.courseOffering.course.courseCode,
          name: enrollment.courseOffering.course.courseName,
          creditHours: enrollment.courseOffering.course.creditHours
        },
        section: enrollment.courseOffering.section,
        teacher: enrollment.courseOffering.teacher?.userId
          ? `${enrollment.courseOffering.teacher.userId.firstName} ${enrollment.courseOffering.teacher.userId.lastName}`
          : null,
        academicYear: enrollment.academicYear,
        semesterNumber: enrollment.semesterNumber
      };
    }));

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

// @desc    Check prerequisites for a course
// @route   GET /api/student/check-prerequisites/:courseId
// @access  Private (Student)
export const checkMyPrerequisites = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate('prerequisites', 'courseCode courseName creditHours');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const result = await checkPrerequisites(student._id, courseId);

    res.status(200).json({
      success: true,
      data: {
        course: {
          code: course.courseCode,
          name: course.courseName
        },
        prerequisites: course.prerequisites.map(p => ({
          code: p.courseCode,
          name: p.courseName,
          creditHours: p.creditHours
        })),
        satisfied: result.satisfied,
        missing: result.missing
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking prerequisites',
      error: error.message
    });
  }
};
