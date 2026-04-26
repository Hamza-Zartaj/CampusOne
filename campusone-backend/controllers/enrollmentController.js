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

// Helper: Check if student has completed prerequisites
const checkPrerequisites = async (studentId, courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { prerequisites: true }
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
    prereq => !completedCourseIds.includes(prereq.id)
  );

  const missingDetails = await Promise.all(
    missing.map(async (m) => {
      const c = await prisma.course.findUnique({ where: { id: m.id } });
      return { id: m.id, code: c.courseCode, name: c.courseName };
    })
  );

  return {
    satisfied: missing.length === 0,
    missing: missingDetails
  };
};

// Helper: Check for duplicate enrollment
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

// Helper: Check if student already enrolled in same course
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
const promoteFromWaitlist = async (courseOfferingId, count = 1) => {
  const waitlisted = await prisma.enrollment.findMany({
    where: {
      courseOfferingId,
      status: 'waitlisted'
    },
    orderBy: { waitlistPosition: 'asc' },
    take: count
  });

  const promoted = [];
  for (const enrollment of waitlisted) {
    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'enrolled',
        waitlistPosition: null,
        promotedFromWaitlistAt: new Date(),
        enrolledAt: new Date()
      }
    });
    promoted.push(updated);

    await prisma.courseOffering.update({
      where: { id: courseOfferingId },
      data: { currentEnrollment: { increment: 1 } }
    });
  }

  // Reorder remaining waitlist
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

  return promoted;
};

/**
 * @desc    Enroll student in a course offering
 * @route   POST /api/enrollments
 * @access  Private
 */
export const enrollStudent = async (req, res) => {
  try {
    const { studentId, courseOfferingId, enrollmentType = 'regular', forceEnroll = false } = req.body;

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
        message: 'Enrollment is closed for this course offering'
      });
    }

    const duplicate = await checkDuplicateEnrollment(studentId, courseOfferingId);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course offering',
        enrollment: duplicate
      });
    }

    const sameCourse = await checkSameCourseEnrollment(
      studentId,
      courseOffering.courseId,
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

    if (enrollmentType !== 'audit' && !forceEnroll) {
      const prereqCheck = await checkPrerequisites(studentId, courseOffering.courseId);
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
        message: 'Course offering is at full capacity and waitlist is not enabled'
      });
    }

    const enrollmentData = {
      studentId,
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
        student: { select: { id: true, studentId: true, user: { select: { id: true, name: true, email: true } } } },
        courseOffering: { include: { course: { select: { id: true, courseCode: true, courseName: true, creditHours: true } } } },
        program: { select: { id: true, programCode: true, name: true } }
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

/**
 * @desc    Drop enrollment
 * @route   PUT /api/enrollments/:id/drop
 * @access  Private
 */
export const dropEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { courseOffering: true }
    });

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
    const courseOfferingId = enrollment.courseOfferingId;

    const updated = await prisma.enrollment.update({
      where: { id },
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

      await promoteFromWaitlist(courseOfferingId, 1);
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
      message: 'Enrollment dropped successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error dropping enrollment',
      error: error.message
    });
  }
};

/**
 * @desc    Withdraw from enrollment
 * @route   PUT /api/enrollments/:id/withdraw
 * @access  Private
 */
export const withdrawEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { courseOffering: true }
    });

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

    const updated = await prisma.enrollment.update({
      where: { id },
      data: {
        status: 'withdrawn',
        grade: 'W',
        droppedAt: new Date(),
        dropReason: reason
      }
    });

    await prisma.courseOffering.update({
      where: { id: enrollment.courseOfferingId },
      data: { currentEnrollment: { decrement: 1 } }
    });

    await promoteFromWaitlist(enrollment.courseOfferingId, 1);

    res.status(200).json({
      success: true,
      message: 'Successfully withdrawn from course',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error withdrawing from enrollment',
      error: error.message
    });
  }
};

/**
 * @desc    Get waitlist for a course offering
 * @route   GET /api/enrollments/waitlist/:courseOfferingId
 * @access  Private
 */
export const getWaitlist = async (req, res) => {
  try {
    const { courseOfferingId } = req.params;

    const waitlist = await prisma.enrollment.findMany({
      where: {
        courseOfferingId,
        status: 'waitlisted'
      },
      orderBy: { waitlistPosition: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
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

/**
 * @desc    Get student's waitlist position
 * @route   GET /api/enrollments/waitlist-position/:enrollmentId
 * @access  Private
 */
export const getWaitlistPosition = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });

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

    const totalWaitlisted = await prisma.enrollment.count({
      where: {
        courseOfferingId: enrollment.courseOfferingId,
        status: 'waitlisted'
      }
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

/**
 * @desc    Update enrollment grade
 * @route   PUT /api/enrollments/:id/grade
 * @access  Private
 */
export const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, midtermMarks, finalMarks, assignmentMarks, quizMarks, labMarks, totalMarks, remarks } = req.body;

    const enrollment = await prisma.enrollment.findUnique({ where: { id } });

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

    const updateData = {};
    if (midtermMarks !== undefined) updateData.midtermMarks = midtermMarks;
    if (finalMarks !== undefined) updateData.finalMarks = finalMarks;
    if (assignmentMarks !== undefined) updateData.assignmentMarks = assignmentMarks;
    if (quizMarks !== undefined) updateData.quizMarks = quizMarks;
    if (labMarks !== undefined) updateData.labMarks = labMarks;
    if (totalMarks !== undefined) updateData.totalMarks = totalMarks;
    if (remarks !== undefined) updateData.remarks = remarks;

    if (grade) {
      updateData.grade = grade;
      updateData.gradePoints = GRADE_POINTS[grade];
      
      if (grade !== 'I' && grade !== 'W') {
        updateData.status = grade === 'F' ? 'failed' : 'completed';
        updateData.completedAt = new Date();
      }
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Grade updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating grade',
      error: error.message
    });
  }
};

/**
 * @desc    Get student transcript
 * @route   GET /api/enrollments/transcript/:studentId
 * @access  Private
 */
export const getTranscript = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { in: ['completed', 'failed', 'withdrawn'] }
      },
      include: {
        courseOffering: {
          select: {
            id: true,
            academicYear: true,
            semesterNumber: true,
            section: true,
            course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } }
          }
        },
        program: { select: { id: true, programCode: true, name: true } }
      },
      orderBy: [{ courseOffering: { academicYear: 'asc' } }, { courseOffering: { semesterNumber: 'asc' } }]
    });

    const semesters = {};
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;
    let totalGradePoints = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.courseOffering?.course) continue;

      const key = `${enrollment.courseOffering.academicYear}-S${enrollment.courseOffering.semesterNumber}`;
      const creditHours = enrollment.courseOffering.course.creditHours;

      if (!semesters[key]) {
        semesters[key] = {
          academicYear: enrollment.courseOffering.academicYear,
          semesterNumber: enrollment.courseOffering.semesterNumber,
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
        creditHours,
        grade: enrollment.grade,
        gradePoints: enrollment.gradePoints,
        status: enrollment.status,
        section: enrollment.courseOffering.section,
        enrollmentType: enrollment.enrollmentType
      };

      semesters[key].courses.push(course);

      if (!['W', 'I', 'P', 'NP'].includes(enrollment.grade)) {
        semesters[key].semesterCreditsAttempted += creditHours;
        totalCreditsAttempted += creditHours;

        if (enrollment.gradePoints !== null && enrollment.gradePoints !== undefined) {
          semesters[key].semesterGradePoints += enrollment.gradePoints * creditHours;
          totalGradePoints += enrollment.gradePoints * creditHours;

          if (enrollment.grade !== 'F') {
            semesters[key].semesterCreditsEarned += creditHours;
            totalCreditsEarned += creditHours;
          }
        }
      }
    }

    const semesterList = Object.values(semesters).map(sem => {
      sem.semesterGPA = sem.semesterCreditsAttempted > 0 
        ? Math.round((sem.semesterGradePoints / sem.semesterCreditsAttempted) * 100) / 100
        : 0;
      return sem;
    }).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      return a.semesterNumber - b.semesterNumber;
    });

    const cgpa = totalCreditsAttempted > 0 
      ? Math.round((totalGradePoints / totalCreditsAttempted) * 100) / 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          name: student.user.name,
          email: student.user.email,
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

/**
 * @desc    Calculate CGPA for a student
 * @route   GET /api/enrollments/cgpa/:studentId
 * @access  Private
 */
export const calculateCGPA = async (req, res) => {
  try {
    const { studentId } = req.params;

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { in: ['completed', 'failed'] },
        grade: { notIn: ['W', 'I', 'P', 'NP'] }
      },
      include: {
        courseOffering: {
          select: {
            course: { select: { id: true, creditHours: true } }
          }
        }
      }
    });

    let totalCredits = 0;
    let totalGradePoints = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.courseOffering?.course) continue;
      
      const creditHours = enrollment.courseOffering.course.creditHours;
      const gradePoints = enrollment.gradePoints || 0;

      totalCredits += creditHours;
      totalGradePoints += gradePoints * creditHours;
    }

    const cgpa = totalCredits > 0 
      ? Math.round((totalGradePoints / totalCredits) * 100) / 100
      : 0;

    await prisma.student.update({
      where: { id: studentId },
      data: {
        cgpa,
        totalCredits
      }
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

/**
 * @desc    Get all enrollments with pagination
 * @route   GET /api/enrollments
 * @access  Private
 */
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
      enrollmentType
    } = req.query;

    const where = {};
    if (student) where.studentId = student;
    if (courseOffering) where.courseOfferingId = courseOffering;
    if (program) where.programId = program;
    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);
    if (status) where.status = status;
    if (enrollmentType) where.enrollmentType = enrollmentType;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await prisma.enrollment.count({ where });
    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, studentId: true, user: { select: { id: true, name: true, email: true } } } },
        courseOffering: {
          select: {
            id: true,
            section: true,
            academicYear: true,
            semesterNumber: true,
            course: { select: { id: true, courseCode: true, courseName: true, creditHours: true } }
          }
        },
        program: { select: { id: true, programCode: true, name: true } }
      },
      orderBy: { enrolledAt: 'desc' },
      skip,
      take: limitNum
    });

    res.status(200).json({
      success: true,
      data: enrollments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
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

/**
 * @desc    Get single enrollment
 * @route   GET /api/enrollments/:id
 * @access  Private
 */
export const getEnrollment = async (req, res) => {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, studentId: true, user: { select: { id: true, name: true, email: true } } } },
        courseOffering: {
          include: {
            course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, prerequisites: true } },
            teacher: { select: { id: true, user: { select: { id: true, name: true } } } }
          }
        },
        program: { select: { id: true, programCode: true, name: true } }
      }
    });

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

/**
 * @desc    Get enrollments by student
 * @route   GET /api/enrollments/student/:studentId
 * @access  Private
 */
export const getStudentEnrollments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semesterNumber, status } = req.query;

    const where = { studentId };
    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);
    if (status) where.status = status;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        courseOffering: {
          include: {
            course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } },
            teacher: { select: { id: true, user: { select: { id: true, name: true } } } }
          }
        },
        program: { select: { id: true, programCode: true, name: true } }
      },
      orderBy: [{ courseOffering: { academicYear: 'desc' } }, { courseOffering: { semesterNumber: 'desc' } }]
    });

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

/**
 * @desc    Get enrollments for a course offering
 * @route   GET /api/enrollments/offering/:courseOfferingId
 * @access  Private
 */
export const getCourseOfferingEnrollments = async (req, res) => {
  try {
    const { courseOfferingId } = req.params;
    const { status } = req.query;

    const where = { courseOfferingId };
    if (status) where.status = status;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            batch: true,
            currentSemester: true,
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { enrolledAt: 'asc' }
    });

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

/**
 * @desc    Bulk enroll students in courses
 * @route   POST /api/enrollments/bulk
 * @access  Private (Admin)
 */
export const bulkEnroll = async (req, res) => {
  try {
    const { enrollments } = req.body;

    if (!Array.isArray(enrollments) || enrollments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid enrollments array'
      });
    }

    const results = { successful: [], failed: [] };

    for (const { studentId, courseOfferingId, enrollmentType = 'regular' } of enrollments) {
      try {
        const [offering, student] = await Promise.all([
          prisma.courseOffering.findUnique({ where: { id: courseOfferingId } }),
          prisma.student.findUnique({ where: { id: studentId } })
        ]);

        if (!offering) {
          results.failed.push({ studentId, courseOfferingId, error: 'Course offering not found' });
          continue;
        }
        if (!student) {
          results.failed.push({ studentId, courseOfferingId, error: 'Student not found' });
          continue;
        }

        const duplicate = await checkDuplicateEnrollment(studentId, courseOfferingId);
        if (duplicate) {
          results.failed.push({ studentId, courseOfferingId, error: 'Student already enrolled' });
          continue;
        }

        const enrollment = await prisma.enrollment.create({
          data: {
            studentId,
            courseOfferingId,
            programId: offering.programId,
            academicYear: offering.academicYear,
            semesterNumber: offering.semesterNumber,
            enrollmentType,
            status: 'enrolled',
            enrolledAt: new Date()
          }
        });

        await prisma.courseOffering.update({
          where: { id: courseOfferingId },
          data: { currentEnrollment: { increment: 1 } }
        });

        results.successful.push(enrollment);
      } catch (err) {
        results.failed.push({ studentId, courseOfferingId, error: err.message });
      }
    }

    res.status(201).json({
      success: results.failed.length === 0,
      message: `${results.successful.length} enrolled, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error in bulk enrollment', error: error.message });
  }
};

/**
 * @desc    Soft delete an enrollment
 * @route   DELETE /api/enrollments/:id
 * @access  Private (Admin)
 */
export const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status: 'deleted' }
    });

    if (['enrolled', 'active'].includes(enrollment.status)) {
      await prisma.courseOffering.update({
        where: { id: enrollment.courseOfferingId },
        data: { currentEnrollment: { decrement: 1 } }
      });
    }

    res.status(200).json({ success: true, message: 'Enrollment deleted successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting enrollment', error: error.message });
  }
};

/**
 * @desc    Restore a soft-deleted enrollment
 * @route   PUT /api/enrollments/:id/restore
 * @access  Private (Admin)
 */
export const restoreEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    if (enrollment.status !== 'deleted') {
      return res.status(400).json({ success: false, message: 'Only deleted enrollments can be restored' });
    }

    const updated = await prisma.enrollment.update({ where: { id }, data: { status: 'enrolled' } });

    await prisma.courseOffering.update({
      where: { id: enrollment.courseOfferingId },
      data: { currentEnrollment: { increment: 1 } }
    });

    res.status(200).json({ success: true, message: 'Enrollment restored successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error restoring enrollment', error: error.message });
  }
};

/**
 * @desc    Activate a deactivated enrollment
 * @route   PUT /api/enrollments/:id/activate
 * @access  Private (Admin)
 */
export const activateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const updated = await prisma.enrollment.update({ where: { id }, data: { status: 'active' } });

    res.status(200).json({ success: true, message: 'Enrollment activated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error activating enrollment', error: error.message });
  }
};

/**
 * @desc    Check prerequisites for a course for a student
 * @route   GET /api/enrollments/check-prerequisites/:courseId
 * @access  Private
 */
export const checkPrerequisitesEndpoint = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId query param is required' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { prerequisites: true }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const result = await checkPrerequisites(studentId, courseId);

    res.status(200).json({
      success: true,
      data: {
        courseId,
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

/**
 * @desc    Get enrollment summary for a semester
 * @route   GET /api/enrollments/semester-summary
 * @access  Private (Admin)
 */
export const getSemesterSummary = async (req, res) => {
  try {
    const { academicYear, semesterNumber, programId } = req.query;

    if (!academicYear || !semesterNumber) {
      return res.status(400).json({ success: false, message: 'academicYear and semesterNumber are required' });
    }

    const where = { academicYear, semesterNumber: parseInt(semesterNumber) };
    if (programId) where.programId = programId;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { studentId: true, user: { select: { name: true } } } },
        courseOffering: { include: { course: { select: { courseCode: true, courseName: true, creditHours: true } } } }
      }
    });

    const statusBreakdown = enrollments.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        academicYear,
        semesterNumber: parseInt(semesterNumber),
        totalEnrollments: enrollments.length,
        statusBreakdown,
        totalCredits: enrollments.reduce((sum, e) => sum + (e.courseOffering?.course?.creditHours || 0), 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching semester summary', error: error.message });
  }
};
