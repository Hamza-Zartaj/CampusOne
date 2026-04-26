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

// Grade thresholds for auto-grading
const GRADE_THRESHOLDS = {
  90: 'A+', 85: 'A', 80: 'A-',
  75: 'B+', 70: 'B', 65: 'B-',
  60: 'C+', 55: 'C', 50: 'C-',
  45: 'D+', 40: 'D', 0: 'F'
};

// Helper: Get teacher from user
const getTeacherFromUser = async (userId) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  return teacher;
};

// Helper: Verify teacher ownership
const verifyTeacherOwnership = async (teacherId, offeringId) => {
  const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) return { valid: false, error: 'Course offering not found', status: 404 };
  if (offering.teacherId !== teacherId) {
    return { valid: false, error: 'You are not assigned to this course offering', status: 403 };
  }
  return { valid: true, offering };
};

// Helper: Calculate grade from total marks
const calculateGrade = (totalMarks) => {
  for (const [threshold, grade] of Object.entries(GRADE_THRESHOLDS).sort((a, b) => b[0] - a[0])) {
    if (totalMarks >= parseInt(threshold)) {
      return grade;
    }
  }
  return 'F';
};

/**
 * @desc    Get my course offerings (as teacher)
 * @route   GET /api/teacher-tools/my-offerings
 * @access  Private (Teacher)
 */
export const getMyOfferings = async (req, res) => {
  try {
    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const { academicYear, semesterNumber, status } = req.query;

    const where = { teacherId: teacher.id };
    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);
    if (status) where.status = status;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } },
        program: { select: { id: true, programCode: true, name: true } },
        tas: { select: { id: true, studentId: true, user: { select: { id: true, name: true, email: true } } } }
      },
      orderBy: [{ academicYear: 'desc' }, { semesterNumber: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: offerings.length,
      data: offerings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching offerings',
      error: error.message
    });
  }
};

/**
 * @desc    Get enrolled students for a course offering
 * @route   GET /api/teacher-tools/offerings/:offeringId/students
 * @access  Private (Teacher)
 */
export const getEnrolledStudents = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { status, sortBy = 'name' } = req.query;

    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const ownership = await verifyTeacherOwnership(teacher.id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    const where = {
      courseOfferingId: offeringId,
      status: { notIn: ['dropped', 'withdrawn'] }
    };
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

    const students = enrollments.map((enrollment, index) => ({
      enrollmentId: enrollment.id,
      rollNumber: index + 1,
      studentId: enrollment.student?.studentId,
      studentObjectId: enrollment.student?.id,
      name: enrollment.student?.user?.name || 'Unknown',
      email: enrollment.student?.user?.email,
      batch: enrollment.student?.batch,
      currentSemester: enrollment.student?.currentSemester,
      enrollmentStatus: enrollment.status,
      enrollmentType: enrollment.enrollmentType,
      enrolledAt: enrollment.enrolledAt,
      midtermMarks: enrollment.midtermMarks,
      finalMarks: enrollment.finalMarks,
      assignmentMarks: enrollment.assignmentMarks,
      quizMarks: enrollment.quizMarks,
      labMarks: enrollment.labMarks,
      totalMarks: enrollment.totalMarks,
      grade: enrollment.grade,
      gradePoints: enrollment.gradePoints
    }));

    if (sortBy === 'name') {
      students.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'studentId') {
      students.sort((a, b) => (a.studentId || '').localeCompare(b.studentId || ''));
    } else if (sortBy === 'totalMarks') {
      students.sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0));
    }

    res.status(200).json({
      success: true,
      offering: {
        id: ownership.offering.id,
        academicYear: ownership.offering.academicYear,
        semesterNumber: ownership.offering.semesterNumber,
        section: ownership.offering.section,
        resultsLocked: ownership.offering.resultsLocked
      },
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrolled students',
      error: error.message
    });
  }
};

/**
 * @desc    Upload marks for a single student
 * @route   PUT /api/teacher-tools/enrollments/:enrollmentId/marks
 * @access  Private (Teacher)
 */
export const uploadStudentMarks = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { midtermMarks, finalMarks, assignmentMarks, quizMarks, labMarks, totalMarks, remarks } = req.body;

    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { courseOffering: true }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const ownership = await verifyTeacherOwnership(teacher.id, enrollment.courseOfferingId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    if (ownership.offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are locked for this course offering'
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

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Marks uploaded successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading marks',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk upload marks for a course offering
 * @route   PUT /api/teacher-tools/offerings/:offeringId/bulk-marks
 * @access  Private (Teacher)
 */
export const bulkUploadMarks = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { marks } = req.body;

    if (!marks || !Array.isArray(marks)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide marks array'
      });
    }

    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const ownership = await verifyTeacherOwnership(teacher.id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    if (ownership.offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are locked for this course offering'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const entry of marks) {
      try {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            id: entry.enrollmentId,
            courseOfferingId: offeringId
          }
        });

        if (!enrollment) {
          results.failed.push({
            enrollmentId: entry.enrollmentId,
            reason: 'Enrollment not found'
          });
          continue;
        }

        const updateData = {};
        if (entry.midtermMarks !== undefined) updateData.midtermMarks = entry.midtermMarks;
        if (entry.finalMarks !== undefined) updateData.finalMarks = entry.finalMarks;
        if (entry.assignmentMarks !== undefined) updateData.assignmentMarks = entry.assignmentMarks;
        if (entry.quizMarks !== undefined) updateData.quizMarks = entry.quizMarks;
        if (entry.labMarks !== undefined) updateData.labMarks = entry.labMarks;
        if (entry.totalMarks !== undefined) updateData.totalMarks = entry.totalMarks;
        if (entry.remarks !== undefined) updateData.remarks = entry.remarks;

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: updateData
        });

        results.successful.push({
          enrollmentId: entry.enrollmentId,
          studentId: enrollment.studentId
        });
      } catch (error) {
        results.failed.push({
          enrollmentId: entry.enrollmentId,
          reason: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk marks upload completed',
      data: results,
      summary: {
        total: marks.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in bulk marks upload',
      error: error.message
    });
  }
};

/**
 * @desc    Submit grade for a single student
 * @route   PUT /api/teacher-tools/enrollments/:enrollmentId/grade
 * @access  Private (Teacher)
 */
export const submitStudentGrade = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { grade, autoCalculate = false } = req.body;

    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { courseOffering: true }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const ownership = await verifyTeacherOwnership(teacher.id, enrollment.courseOfferingId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    if (ownership.offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are locked for this course offering'
      });
    }

    let finalGrade = grade;
    if (autoCalculate && enrollment.totalMarks !== undefined) {
      finalGrade = calculateGrade(enrollment.totalMarks);
    }

    if (!finalGrade) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a grade or enable auto-calculation with total marks'
      });
    }

    if (!GRADE_POINTS.hasOwnProperty(finalGrade)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid grade',
        validGrades: Object.keys(GRADE_POINTS)
      });
    }

    const updateData = {
      grade: finalGrade,
      gradePoints: GRADE_POINTS[finalGrade]
    };

    if (!['I', 'W'].includes(finalGrade)) {
      updateData.status = finalGrade === 'F' ? 'failed' : 'completed';
      updateData.completedAt = new Date();
    }

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Grade submitted successfully',
      data: {
        enrollmentId: updated.id,
        grade: updated.grade,
        gradePoints: updated.gradePoints,
        status: updated.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting grade',
      error: error.message
    });
  }
};

/**
 * @desc    Submit final grades for entire course offering
 * @route   PUT /api/teacher-tools/offerings/:offeringId/submit-grades
 * @access  Private (Teacher)
 */
export const submitFinalGrades = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { autoCalculate = true, grades } = req.body;

    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const ownership = await verifyTeacherOwnership(teacher.id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    if (ownership.offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are locked for this course offering'
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseOfferingId: offeringId,
        status: { in: ['enrolled', 'active'] }
      }
    });

    const gradeMap = new Map();
    if (grades && Array.isArray(grades)) {
      grades.forEach(g => gradeMap.set(g.enrollmentId, g.grade));
    }

    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    for (const enrollment of enrollments) {
      try {
        let finalGrade;

        if (gradeMap.has(enrollment.id)) {
          finalGrade = gradeMap.get(enrollment.id);
        } else if (autoCalculate && enrollment.totalMarks !== undefined) {
          finalGrade = calculateGrade(enrollment.totalMarks);
        } else {
          results.skipped.push({
            enrollmentId: enrollment.id,
            reason: 'No grade provided and no total marks for auto-calculation'
          });
          continue;
        }

        if (!GRADE_POINTS.hasOwnProperty(finalGrade)) {
          results.failed.push({
            enrollmentId: enrollment.id,
            reason: `Invalid grade: ${finalGrade}`
          });
          continue;
        }

        const updateData = {
          grade: finalGrade,
          gradePoints: GRADE_POINTS[finalGrade]
        };

        if (!['I', 'W'].includes(finalGrade)) {
          updateData.status = finalGrade === 'F' ? 'failed' : 'completed';
          updateData.completedAt = new Date();
        }

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: updateData
        });

        results.successful.push({
          enrollmentId: enrollment.id,
          grade: finalGrade,
          gradePoints: GRADE_POINTS[finalGrade]
        });
      } catch (error) {
        results.failed.push({
          enrollmentId: enrollment.id,
          reason: error.message
        });
      }
    }

    await prisma.courseOffering.update({
      where: { id: offeringId },
      data: {
        gradesSubmittedAt: new Date(),
        gradesSubmittedBy: teacher.userId
      }
    });

    res.status(200).json({
      success: true,
      message: 'Final grades submitted',
      data: results,
      summary: {
        total: enrollments.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting final grades',
      error: error.message
    });
  }
};

/**
 * @desc    Lock results for a course offering
 * @route   PUT /api/teacher-tools/offerings/:offeringId/lock-results
 * @access  Private (Teacher/Admin)
 */
export const lockResults = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const teacher = await getTeacherFromUser(req.user.id);
    
    if (teacher) {
      const ownership = await verifyTeacherOwnership(teacher.id, offeringId);
      if (!ownership.valid) {
        return res.status(ownership.status).json({
          success: false,
          message: ownership.error
        });
      }
    }

    const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are already locked'
      });
    }

    const pendingEnrollments = await prisma.enrollment.count({
      where: {
        courseOfferingId: offeringId,
        status: { in: ['enrolled', 'active'] },
        grade: null
      }
    });

    if (pendingEnrollments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot lock results. ${pendingEnrollments} student(s) still have pending grades.`
      });
    }

    const updated = await prisma.courseOffering.update({
      where: { id: offeringId },
      data: {
        resultsLocked: true,
        resultsLockedAt: new Date(),
        resultsLockedBy: req.user.id,
        status: 'completed'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Results locked successfully',
      data: {
        offeringId: updated.id,
        resultsLocked: updated.resultsLocked,
        resultsLockedAt: updated.resultsLockedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error locking results',
      error: error.message
    });
  }
};

/**
 * @desc    Unlock results for a course offering (Admin only)
 * @route   PUT /api/teacher-tools/offerings/:offeringId/unlock-results
 * @access  Private (Admin only)
 */
export const unlockResults = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { reason } = req.body;

    const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (!offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are not locked'
      });
    }

    const updated = await prisma.courseOffering.update({
      where: { id: offeringId },
      data: {
        resultsLocked: false,
        resultsLockedAt: null,
        resultsLockedBy: null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Results unlocked successfully',
      data: {
        offeringId: updated.id,
        resultsLocked: updated.resultsLocked
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unlocking results',
      error: error.message
    });
  }
};

/**
 * @desc    Get grade summary for a course offering
 * @route   GET /api/teacher-tools/offerings/:offeringId/grade-summary
 * @access  Private (Teacher)
 */
export const getGradeSummary = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const ownership = await verifyTeacherOwnership(teacher.id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseOfferingId: offeringId,
        status: { notIn: ['dropped'] }
      }
    });

    const stats = {
      totalEnrolled: enrollments.length,
      graded: 0,
      pending: 0,
      withdrawn: 0,
      passed: 0,
      failed: 0,
      gradeDistribution: {},
      averageMarks: null,
      averageGradePoints: null,
      highestMarks: null,
      lowestMarks: null
    };

    let totalMarks = 0;
    let marksCount = 0;
    let totalGradePoints = 0;
    let gradePointsCount = 0;

    for (const enrollment of enrollments) {
      if (enrollment.status === 'withdrawn') {
        stats.withdrawn++;
        continue;
      }

      if (enrollment.grade) {
        stats.graded++;
        stats.gradeDistribution[enrollment.grade] = (stats.gradeDistribution[enrollment.grade] || 0) + 1;

        if (enrollment.grade === 'F') {
          stats.failed++;
        } else if (!['I', 'W', 'NP'].includes(enrollment.grade)) {
          stats.passed++;
        }

        if (enrollment.gradePoints !== null && enrollment.gradePoints !== undefined) {
          totalGradePoints += enrollment.gradePoints;
          gradePointsCount++;
        }
      } else {
        stats.pending++;
      }

      if (enrollment.totalMarks !== undefined && enrollment.totalMarks !== null) {
        totalMarks += enrollment.totalMarks;
        marksCount++;
        if (stats.highestMarks === null || enrollment.totalMarks > stats.highestMarks) {
          stats.highestMarks = enrollment.totalMarks;
        }
        if (stats.lowestMarks === null || enrollment.totalMarks < stats.lowestMarks) {
          stats.lowestMarks = enrollment.totalMarks;
        }
      }
    }

    stats.averageMarks = marksCount > 0 ? Math.round((totalMarks / marksCount) * 100) / 100 : null;
    stats.averageGradePoints = gradePointsCount > 0 ? Math.round((totalGradePoints / gradePointsCount) * 100) / 100 : null;
    stats.passRate = stats.graded > 0 ? Math.round((stats.passed / (stats.graded - stats.withdrawn)) * 100) : null;

    res.status(200).json({
      success: true,
      offering: {
        id: ownership.offering.id,
        resultsLocked: ownership.offering.resultsLocked,
        gradesSubmittedAt: ownership.offering.gradesSubmittedAt
      },
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching grade summary',
      error: error.message
    });
  }
};

/**
 * @desc    Export grades for a course offering
 * @route   GET /api/teacher-tools/offerings/:offeringId/export-grades
 * @access  Private (Teacher)
 */
export const exportGrades = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const ownership = await verifyTeacherOwnership(teacher.id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: { select: { id: true, courseCode: true, courseName: true, creditHours: true } },
        program: { select: { id: true, programCode: true, name: true } }
      }
    });

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseOfferingId: offeringId,
        status: { notIn: ['dropped'] }
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            batch: true,
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { 'student.studentId': 'asc' }
    });

    const exportData = enrollments.map((enrollment, index) => ({
      sNo: index + 1,
      studentId: enrollment.student?.studentId,
      name: enrollment.student?.user?.name || '',
      email: enrollment.student?.user?.email,
      batch: enrollment.student?.batch,
      midtermMarks: enrollment.midtermMarks,
      finalMarks: enrollment.finalMarks,
      assignmentMarks: enrollment.assignmentMarks,
      quizMarks: enrollment.quizMarks,
      labMarks: enrollment.labMarks,
      totalMarks: enrollment.totalMarks,
      grade: enrollment.grade,
      gradePoints: enrollment.gradePoints,
      status: enrollment.status
    }));

    res.status(200).json({
      success: true,
      offering: {
        courseCode: offering.course.courseCode,
        courseName: offering.course.courseName,
        academicYear: offering.academicYear,
        semesterNumber: offering.semesterNumber,
        section: offering.section
      },
      data: exportData,
      count: exportData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting grades',
      error: error.message
    });
  }
};

/**
 * @desc    Get Excel marks upload template for a course offering
 * @route   GET /api/teacher-tools/offerings/:offeringId/marks-template
 * @access  Private (Teacher)
 */
export const getMarksTemplate = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: { select: { courseCode: true, courseName: true } },
        enrollments: {
          where: { status: { in: ['enrolled', 'active'] } },
          include: {
            student: {
              select: {
                studentId: true,
                user: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    if (!offering) {
      return res.status(404).json({ success: false, message: 'Course offering not found' });
    }

    const template = {
      courseCode: offering.course?.courseCode,
      courseName: offering.course?.courseName,
      section: offering.section,
      semester: offering.semesterNumber,
      academicYear: offering.academicYear,
      columns: ['studentId', 'studentName', 'midtermMarks', 'finalMarks', 'assignmentMarks', 'quizMarks', 'labMarks'],
      students: offering.enrollments.map(e => ({
        enrollmentId: e.id,
        studentId: e.student?.studentId,
        studentName: e.student?.user?.name,
        midtermMarks: '',
        finalMarks: '',
        assignmentMarks: '',
        quizMarks: '',
        labMarks: ''
      }))
    };

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating marks template', error: error.message });
  }
};
