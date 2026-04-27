import prisma from '../prisma/client.js';

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
  const student = await prisma.student.findUnique({ where: { userId } });
  return student;
};

// Helper: Check prerequisites
const checkPrerequisites = async (studentId, courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { prerequisites: { include: { prerequisite: true } } }
  });
  
  if (!course?.prerequisites || course.prerequisites.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const completedEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: 'completed',
      grade: { notIn: ['F', 'W', 'I', 'NP'] }
    },
    include: { courseOffering: { select: { courseId: true } } }
  });

  const completedCourseIds = completedEnrollments
    .filter(e => e.courseOffering?.courseId)
    .map(e => e.courseOffering.courseId);

  const missing = course.prerequisites.filter(
    entry => !completedCourseIds.includes(entry.prerequisiteId)
  );

  const missingDetails = missing.map(entry => ({
    id: entry.prerequisite.id,
    code: entry.prerequisite.courseCode,
    name: entry.prerequisite.courseName
  }));

  return {
    satisfied: missing.length === 0,
    missing: missingDetails
  };
};

// Helper: Check duplicate enrollment
const checkDuplicateEnrollment = async (studentId, courseOfferingId) => {
  const existing = await prisma.enrollment.findFirst({
    where: {
      studentId,
      courseOfferingId,
      status: { notIn: ['dropped', 'withdrawn'] }
    }
  });
  return existing;
};

// Helper: Check same course enrollment
const checkSameCourseEnrollment = async (studentId, courseId, academicYear, semesterNumber) => {
  const offerings = await prisma.courseOffering.findMany({
    where: {
      courseId,
      academicYear,
      semesterNumber
    },
    select: { id: true }
  });

  const offeringIds = offerings.map(o => o.id);

  const existing = await prisma.enrollment.findFirst({
    where: {
      studentId,
      courseOfferingId: { in: offeringIds },
      status: { notIn: ['dropped', 'withdrawn'] }
    }
  });

  return existing;
};

// Helper: Get next waitlist position
const getNextWaitlistPosition = async (courseOfferingId) => {
  const lastWaitlisted = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId,
      status: 'waitlisted'
    },
    orderBy: { waitlistPosition: 'desc' }
  });
  return lastWaitlisted ? lastWaitlisted.waitlistPosition + 1 : 1;
};

// Helper: Promote from waitlist
const promoteFromWaitlist = async (courseOfferingId) => {
  const waitlisted = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId,
      status: 'waitlisted'
    },
    orderBy: { waitlistPosition: 'asc' }
  });

  if (waitlisted) {
    await prisma.enrollment.update({
      where: { id: waitlisted.id },
      data: {
        status: 'enrolled',
        waitlistPosition: null,
        promotedFromWaitlistAt: new Date(),
        enrolledAt: new Date()
      }
    });

    await prisma.courseOffering.update({
      where: { id: courseOfferingId },
      data: { currentEnrollment: { increment: 1 } }
    });

    const remaining = await prisma.enrollment.findMany({
      where: {
        courseOfferingId,
        status: 'waitlisted'
      },
      orderBy: { waitlistPosition: 'asc' }
    });

    for (let i = 0; i < remaining.length; i++) {
      await prisma.enrollment.update({
        where: { id: remaining[i].id },
        data: { waitlistPosition: i + 1 }
      });
    }

    return waitlisted;
  }
  return null;
};

/**
 * @desc    Get my profile (student)
 * @route   GET /api/student/profile
 * @access  Private (Student)
 */
export const getMyProfile = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const data = await prisma.student.findUnique({
      where: { id: student.id },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

/**
 * @desc    Get my current semester courses
 * @route   GET /api/student/current-courses
 * @access  Private (Student)
 */
export const getCurrentCourses = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { academicYear, semesterNumber } = req.query;

    const where = {
      studentId: student.id,
      status: { in: ['enrolled', 'active', 'waitlisted'] }
    };

    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        courseOffering: {
          include: {
            course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true, description: true } },
            teacher: { select: { id: true, user: { select: { id: true, name: true, email: true } } } },
            program: { select: { id: true, programCode: true, name: true } }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    const courses = enrollments.map(enrollment => ({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      waitlistPosition: enrollment.waitlistPosition,
      enrolledAt: enrollment.enrolledAt,
      enrollmentType: enrollment.enrollmentType,
      course: enrollment.courseOffering?.course,
      offering: {
        id: enrollment.courseOffering?.id,
        section: enrollment.courseOffering?.section,
        academicYear: enrollment.courseOffering?.academicYear,
        semesterNumber: enrollment.courseOffering?.semesterNumber,
        schedule: enrollment.courseOffering?.schedule,
        teacher: enrollment.courseOffering?.teacher?.user?.name || null,
        teacherEmail: enrollment.courseOffering?.teacher?.user?.email
      },
      marks: {
        midterm: enrollment.midtermMarks,
        final: enrollment.finalMarks,
        assignment: enrollment.assignmentMarks,
        quiz: enrollment.quizMarks,
        lab: enrollment.labMarks,
        total: enrollment.totalMarks
      }
    }));

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

/**
 * @desc    Get available course offerings for enrollment
 * @route   GET /api/student/available-offerings
 * @access  Private (Student)
 */
export const getAvailableOfferings = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
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

    const where = {
      academicYear,
      semesterNumber: parseInt(semesterNumber),
      enrollmentStatus: { in: ['open', 'waitlist'] },
      isActive: true
    };

    if (program) where.programId = program;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true, prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true } } } }, description: true } },
        program: { select: { id: true, programCode: true, name: true } },
        teacher: { select: { id: true, user: { select: { id: true, name: true } } } }
      },
      orderBy: { 'course.courseCode': 'asc' }
    });

    const currentEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        status: { notIn: ['dropped', 'withdrawn'] }
      },
      include: { courseOffering: { select: { courseId: true } } }
    });

    const enrolledCourseIds = currentEnrollments
      .filter(e => e.courseOffering)
      .map(e => e.courseOffering.courseId);

    const enrolledOfferingIds = currentEnrollments.map(e => e.courseOfferingId);

    const processedOfferings = await Promise.all(offerings.map(async (offering) => {
      const courseId = offering.courseId;
      const offeringId = offering.id;

      const isEnrolledInOffering = enrolledOfferingIds.includes(offeringId);
      const isEnrolledInCourse = enrolledCourseIds.includes(courseId);

      let prereqStatus = { satisfied: true, missing: [] };
      if (offering.course.prerequisites && offering.course.prerequisites.length > 0) {
        prereqStatus = await checkPrerequisites(student.id, courseId);
      }

      const hasCapacity = offering.currentEnrollment < offering.maxCapacity;
      const canWaitlist = offering.enrollmentStatus === 'waitlist' && !hasCapacity;

      return {
        offeringId: offering.id,
        course: {
          id: offering.course.id,
          code: offering.course.courseCode,
          name: offering.course.courseName,
          creditHours: offering.course.creditHours,
          type: offering.course.courseType,
          description: offering.course.description,
          hasPrerequisites: (offering.course.prerequisites?.length || 0) > 0
        },
        program: {
          id: offering.program?.id,
          code: offering.program?.programCode,
          name: offering.program?.name
        },
        section: offering.section,
        teacher: offering.teacher?.user?.name || null,
        schedule: offering.schedule,
        capacity: {
          max: offering.maxCapacity,
          current: offering.currentEnrollment,
          available: offering.maxCapacity - offering.currentEnrollment
        },
        enrollmentStatus: offering.enrollmentStatus,
        canEnroll: !isEnrolledInCourse && prereqStatus.satisfied && (hasCapacity || canWaitlist),
        alreadyEnrolled: isEnrolledInOffering,
        enrolledInOtherSection: isEnrolledInCourse && !isEnrolledInOffering,
        prerequisites: prereqStatus,
        willWaitlist: !hasCapacity && canWaitlist
      };
    }));

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

/**
 * @desc    Enroll in a course offering
 * @route   POST /api/student/enroll
 * @access  Private (Student)
 */
export const enrollInCourse = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { courseOfferingId, enrollmentType = 'regular' } = req.body;

    const courseOffering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: { course: true, program: true }
    });

    if (!courseOffering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (courseOffering.enrollmentStatus === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is closed for this course'
      });
    }

    const duplicate = await checkDuplicateEnrollment(student.id, courseOfferingId);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course offering'
      });
    }

    const sameCourse = await checkSameCourseEnrollment(
      student.id,
      courseOffering.courseId,
      courseOffering.academicYear,
      courseOffering.semesterNumber
    );
    if (sameCourse) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in another section of this course'
      });
    }

    if (enrollmentType !== 'audit') {
      const prereqCheck = await checkPrerequisites(student.id, courseOffering.courseId);
      if (!prereqCheck.satisfied) {
        return res.status(400).json({
          success: false,
          message: 'Prerequisites not satisfied',
          missingPrerequisites: prereqCheck.missing
        });
      }
    }

    const isAtCapacity = courseOffering.currentEnrollment >= courseOffering.maxCapacity;
    const shouldWaitlist = isAtCapacity && courseOffering.enrollmentStatus === 'waitlist';

    if (isAtCapacity && courseOffering.enrollmentStatus !== 'waitlist') {
      return res.status(400).json({
        success: false,
        message: 'Course is at full capacity'
      });
    }

    const enrollmentData = {
      studentId: student.id,
      courseOfferingId,
      programId: courseOffering.programId,
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

    const enrollment = await prisma.enrollment.create({
      data: enrollmentData,
      include: {
        courseOffering: {
          include: { course: { select: { id: true, courseCode: true, courseName: true, creditHours: true } } }
        }
      }
    });

    if (!shouldWaitlist) {
      await prisma.courseOffering.update({
        where: { id: courseOfferingId },
        data: { currentEnrollment: { increment: 1 } }
      });
    }

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

/**
 * @desc    Drop a course
 * @route   PUT /api/student/drop/:enrollmentId
 * @access  Private (Student)
 */
export const dropCourse = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { enrollmentId } = req.params;
    const { reason } = req.body;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        studentId: student.id
      },
      include: { courseOffering: true }
    });

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
    const courseOfferingId = enrollment.courseOfferingId;

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'dropped',
        droppedAt: new Date(),
        dropReason: reason,
        waitlistPosition: null
      }
    });

    if (!wasWaitlisted) {
      await prisma.courseOffering.update({
        where: { id: courseOfferingId },
        data: { currentEnrollment: { decrement: 1 } }
      });

      await promoteFromWaitlist(courseOfferingId);
    } else {
      const remaining = await prisma.enrollment.findMany({
        where: {
          courseOfferingId,
          status: 'waitlisted'
        },
        orderBy: { waitlistPosition: 'asc' }
      });

      for (let i = 0; i < remaining.length; i++) {
        await prisma.enrollment.update({
          where: { id: remaining[i].id },
          data: { waitlistPosition: i + 1 }
        });
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

/**
 * @desc    Swap course section
 * @route   PUT /api/student/swap
 * @access  Private (Student)
 */
export const swapSection = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { currentEnrollmentId, newOfferingId } = req.body;

    const currentEnrollment = await prisma.enrollment.findFirst({
      where: {
        id: currentEnrollmentId,
        studentId: student.id,
        status: { in: ['enrolled', 'active'] }
      },
      include: { courseOffering: true }
    });

    if (!currentEnrollment) {
      return res.status(404).json({
        success: false,
        message: 'Current enrollment not found or not active'
      });
    }

    const newOffering = await prisma.courseOffering.findUnique({
      where: { id: newOfferingId },
      include: { course: true }
    });

    if (!newOffering) {
      return res.status(404).json({
        success: false,
        message: 'New course offering not found'
      });
    }

    if (currentEnrollment.courseOffering.courseId !== newOffering.courseId) {
      return res.status(400).json({
        success: false,
        message: 'Can only swap between sections of the same course'
      });
    }

    const existingInNew = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        courseOfferingId: newOfferingId,
        status: { notIn: ['dropped', 'withdrawn'] }
      }
    });

    if (existingInNew) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in the target section'
      });
    }

    if (newOffering.currentEnrollment >= newOffering.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Target section is at full capacity'
      });
    }

    if (newOffering.enrollmentStatus === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is closed for target section'
      });
    }

    const oldOfferingId = currentEnrollment.courseOfferingId;

    await prisma.enrollment.update({
      where: { id: currentEnrollmentId },
      data: {
        status: 'dropped',
        droppedAt: new Date(),
        dropReason: `Swapped to section ${newOffering.section}`
      }
    });

    await prisma.courseOffering.update({
      where: { id: oldOfferingId },
      data: { currentEnrollment: { decrement: 1 } }
    });

    const newEnrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseOfferingId: newOfferingId,
        programId: newOffering.programId,
        academicYear: newOffering.academicYear,
        semesterNumber: newOffering.semesterNumber,
        enrollmentType: currentEnrollment.enrollmentType,
        status: 'enrolled',
        enrolledAt: new Date()
      },
      include: {
        courseOffering: {
          include: { course: { select: { id: true, courseCode: true, courseName: true } } }
        }
      }
    });

    await prisma.courseOffering.update({
      where: { id: newOfferingId },
      data: { currentEnrollment: { increment: 1 } }
    });

    await promoteFromWaitlist(oldOfferingId);

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

/**
 * @desc    Get my timetable
 * @route   GET /api/student/timetable
 * @access  Private (Student)
 */
export const getMyTimetable = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { academicYear, semesterNumber } = req.query;

    const where = {
      studentId: student.id,
      status: { in: ['enrolled', 'active'] }
    };

    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        courseOffering: {
          include: {
            course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } },
            teacher: { select: { id: true, user: { select: { id: true, name: true } } } }
          }
        }
      }
    });

    const timetable = enrollments.map(enrollment => ({
      enrollmentId: enrollment.id,
      course: {
        code: enrollment.courseOffering?.course?.courseCode,
        name: enrollment.courseOffering?.course?.courseName,
        creditHours: enrollment.courseOffering?.course?.creditHours,
        type: enrollment.courseOffering?.course?.courseType
      },
      section: enrollment.courseOffering?.section,
      teacher: enrollment.courseOffering?.teacher?.user?.name,
      schedule: enrollment.courseOffering?.schedule || []
    }));

    res.status(200).json({
      success: true,
      count: timetable.length,
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

/**
 * @desc    Get my waitlist positions
 * @route   GET /api/student/waitlist
 * @access  Private (Student)
 */
export const getMyWaitlist = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const waitlisted = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'waitlisted'
      },
      include: {
        courseOffering: {
          include: {
            course: { select: { id: true, courseCode: true, courseName: true, creditHours: true } },
            teacher: { select: { id: true, user: { select: { id: true, name: true } } } }
          }
        }
      },
      orderBy: { waitlistAddedAt: 'asc' }
    });

    const waitlist = await Promise.all(waitlisted.map(async (enrollment) => {
      const totalWaitlisted = await prisma.enrollment.count({
        where: {
          courseOfferingId: enrollment.courseOfferingId,
          status: 'waitlisted'
        }
      });

      return {
        enrollmentId: enrollment.id,
        position: enrollment.waitlistPosition,
        totalInWaitlist: totalWaitlisted,
        addedAt: enrollment.waitlistAddedAt,
        course: {
          code: enrollment.courseOffering?.course?.courseCode,
          name: enrollment.courseOffering?.course?.courseName,
          creditHours: enrollment.courseOffering?.course?.creditHours
        },
        section: enrollment.courseOffering?.section,
        teacher: enrollment.courseOffering?.teacher?.user?.name || null
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

/**
 * @desc    Get dashboard data
 * @route   GET /api/student/dashboard
 * @access  Private (Student)
 */
export const getDashboard = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Current courses
    const currentCourses = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: { in: ['enrolled', 'active'] }
      },
      include: { courseOffering: { include: { course: true } } }
    });

    // Completed courses
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: { in: ['completed', 'failed'] }
      }
    });

    // Waitlisted courses
    const waitlistedEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'waitlisted'
      }
    });

    const totalCredits = currentCourses.reduce((sum, e) => sum + (e.courseOffering?.course?.creditHours || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          name: student.user?.name,
          department: student.department,
          batch: student.batch,
          currentSemester: student.currentSemester,
          cgpa: student.cgpa
        },
        stats: {
          currentEnrollments: currentCourses.length,
          completedCourses: completedEnrollments.length,
          failedCourses: completedEnrollments.filter(e => e.grade === 'F').length,
          totalCredits,
          waitlistedCourses: waitlistedEnrollments.length
        },
        currentCourses: currentCourses.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard',
      error: error.message
    });
  }
};

/**
 * @desc    Get current student's grades
 * @route   GET /api/student/grades
 * @access  Private (Student)
 */
export const getMyGrades = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const { academicYear, semesterNumber } = req.query;

    const where = {
      studentId: student.id,
      grade: { not: null }
    };
    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        courseOffering: {
          include: { course: { select: { courseCode: true, courseName: true, creditHours: true } } }
        }
      },
      orderBy: [{ academicYear: 'desc' }, { semesterNumber: 'desc' }]
    });

    const grades = enrollments.map(e => ({
      enrollmentId: e.id,
      courseCode: e.courseOffering?.course?.courseCode,
      courseName: e.courseOffering?.course?.courseName,
      creditHours: e.courseOffering?.course?.creditHours,
      grade: e.grade,
      gpa: e.gpa,
      obtainedMarks: e.obtainedMarks,
      totalMarks: e.totalMarks,
      percentage: e.percentage,
      marks: {
        midterm: e.midtermMarks,
        final: e.finalMarks,
        assignment: e.assignmentMarks,
        quiz: e.quizMarks,
        lab: e.labMarks
      },
      academicYear: e.academicYear,
      semester: e.semesterNumber
    }));

    res.status(200).json({ success: true, total: grades.length, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching grades', error: error.message });
  }
};

/**
 * @desc    Get current student's full transcript
 * @route   GET /api/student/transcript
 * @access  Private (Student)
 */
export const getMyTranscript = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: { in: ['completed', 'enrolled', 'active'] }
      },
      include: {
        courseOffering: { include: { course: true } }
      },
      orderBy: [{ academicYear: 'asc' }, { semesterNumber: 'asc' }]
    });

    // Group by semester
    const semesterMap = {};
    let totalCreditsEarned = 0;
    let weightedGPASum = 0;

    for (const e of enrollments) {
      const key = `${e.academicYear}-${e.semesterNumber}`;
      if (!semesterMap[key]) {
        semesterMap[key] = { academicYear: e.academicYear, semesterNumber: e.semesterNumber, courses: [] };
      }
      const creditHours = e.courseOffering?.course?.creditHours || 0;
      const gpa = e.gpa ?? GRADE_POINTS[e.grade] ?? null;

      semesterMap[key].courses.push({
        courseCode: e.courseOffering?.course?.courseCode,
        courseName: e.courseOffering?.course?.courseName,
        creditHours,
        grade: e.grade,
        gpa,
        status: e.status
      });

      if (gpa !== null && e.status === 'completed') {
        totalCreditsEarned += creditHours;
        weightedGPASum += gpa * creditHours;
      }
    }

    const cgpa = totalCreditsEarned > 0 ? Math.round((weightedGPASum / totalCreditsEarned) * 100) / 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        studentId: student.studentId,
        semesters: Object.values(semesterMap),
        totalCreditsEarned,
        cgpa
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching transcript', error: error.message });
  }
};

/**
 * @desc    Get current student's CGPA
 * @route   GET /api/student/cgpa
 * @access  Private (Student)
 */
export const getMyCGPA = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'completed',
        grade: { not: null },
        gpa: { not: null }
      },
      include: {
        courseOffering: { include: { course: { select: { creditHours: true } } } }
      }
    });

    let totalCredits = 0;
    let weightedSum = 0;

    for (const e of completedEnrollments) {
      const credits = e.courseOffering?.course?.creditHours || 0;
      const gpa = e.gpa || 0;
      totalCredits += credits;
      weightedSum += gpa * credits;
    }

    const cgpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        cgpa,
        totalCreditsCompleted: totalCredits,
        coursesCompleted: completedEnrollments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calculating CGPA', error: error.message });
  }
};

/**
 * @desc    Check prerequisites for a course
 * @route   GET /api/student/check-prerequisites/:courseId
 * @access  Private (Student)
 */
export const checkMyPrerequisites = async (req, res) => {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const { courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { prerequisites: { include: { prerequisite: true } } }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const result = await checkPrerequisites(student.id, courseId);

    res.status(200).json({
      success: true,
      data: {
        courseCode: course.courseCode,
        courseName: course.courseName,
        prerequisitesSatisfied: result.satisfied,
        missingPrerequisites: result.missing,
        totalPrerequisites: course.prerequisites.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error checking prerequisites', error: error.message });
  }
};
