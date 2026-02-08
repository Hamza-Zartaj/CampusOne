import Enrollment from '../models/Enrollment.js';
import CourseOffering from '../models/CourseOffering.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';

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
  const teacher = await Teacher.findOne({ userId });
  return teacher;
};

// Helper: Verify teacher owns the offering
const verifyTeacherOwnership = async (teacherId, offeringId) => {
  const offering = await CourseOffering.findById(offeringId);
  if (!offering) return { valid: false, error: 'Course offering not found', status: 404 };
  if (offering.teacher.toString() !== teacherId.toString()) {
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

// @desc    Get my course offerings (as teacher)
// @route   GET /api/teacher-tools/my-offerings
// @access  Private (Teacher)
export const getMyOfferings = async (req, res) => {
  try {
    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const { academicYear, semesterNumber, status } = req.query;

    const query = { teacher: teacher._id };
    if (academicYear) query.academicYear = academicYear;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber);
    if (status) query.status = status;

    const offerings = await CourseOffering.find(query)
      .populate('course', 'courseCode courseName creditHours courseType')
      .populate('program', 'programCode programName')
      .populate({
        path: 'tas',
        select: 'userId',
        populate: { path: 'userId', select: 'firstName lastName email' }
      })
      .sort({ academicYear: -1, semesterNumber: 1 });

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

// @desc    Get enrolled students for a course offering
// @route   GET /api/teacher-tools/offerings/:offeringId/students
// @access  Private (Teacher)
export const getEnrolledStudents = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { status, sortBy = 'name' } = req.query;

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    const query = { 
      courseOffering: offeringId,
      status: { $nin: ['dropped', 'withdrawn'] }
    };
    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'student',
        select: 'studentId userId batch currentSemester',
        populate: { path: 'userId', select: 'firstName lastName email' }
      })
      .sort({ enrolledAt: 1 });

    // Format response
    const students = enrollments.map((enrollment, index) => ({
      enrollmentId: enrollment._id,
      rollNumber: index + 1,
      studentId: enrollment.student?.studentId,
      studentObjectId: enrollment.student?._id,
      name: enrollment.student?.userId 
        ? `${enrollment.student.userId.firstName} ${enrollment.student.userId.lastName}`
        : 'Unknown',
      email: enrollment.student?.userId?.email,
      batch: enrollment.student?.batch,
      currentSemester: enrollment.student?.currentSemester,
      enrollmentStatus: enrollment.status,
      enrollmentType: enrollment.enrollmentType,
      enrolledAt: enrollment.enrolledAt,
      // Current marks
      midtermMarks: enrollment.midtermMarks,
      finalMarks: enrollment.finalMarks,
      assignmentMarks: enrollment.assignmentMarks,
      quizMarks: enrollment.quizMarks,
      labMarks: enrollment.labMarks,
      totalMarks: enrollment.totalMarks,
      grade: enrollment.grade,
      gradePoints: enrollment.gradePoints
    }));

    // Sort
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
        id: ownership.offering._id,
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

// @desc    Upload marks for a single student
// @route   PUT /api/teacher-tools/enrollments/:enrollmentId/marks
// @access  Private (Teacher)
export const uploadStudentMarks = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { midtermMarks, finalMarks, assignmentMarks, quizMarks, labMarks, totalMarks, remarks } = req.body;

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('courseOffering');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, enrollment.courseOffering._id);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    // Check if results are locked
    if (ownership.offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are locked for this course offering'
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

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: 'Marks uploaded successfully',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading marks',
      error: error.message
    });
  }
};

// @desc    Bulk upload marks for a course offering
// @route   PUT /api/teacher-tools/offerings/:offeringId/bulk-marks
// @access  Private (Teacher)
export const bulkUploadMarks = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { marks } = req.body; // Array of { enrollmentId, midtermMarks, finalMarks, assignmentMarks, quizMarks, labMarks, totalMarks }

    if (!marks || !Array.isArray(marks)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide marks array'
      });
    }

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    // Check if results are locked
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
        const enrollment = await Enrollment.findOne({
          _id: entry.enrollmentId,
          courseOffering: offeringId
        });

        if (!enrollment) {
          results.failed.push({
            enrollmentId: entry.enrollmentId,
            reason: 'Enrollment not found'
          });
          continue;
        }

        // Update marks
        if (entry.midtermMarks !== undefined) enrollment.midtermMarks = entry.midtermMarks;
        if (entry.finalMarks !== undefined) enrollment.finalMarks = entry.finalMarks;
        if (entry.assignmentMarks !== undefined) enrollment.assignmentMarks = entry.assignmentMarks;
        if (entry.quizMarks !== undefined) enrollment.quizMarks = entry.quizMarks;
        if (entry.labMarks !== undefined) enrollment.labMarks = entry.labMarks;
        if (entry.totalMarks !== undefined) enrollment.totalMarks = entry.totalMarks;
        if (entry.remarks !== undefined) enrollment.remarks = entry.remarks;

        await enrollment.save();
        results.successful.push({
          enrollmentId: entry.enrollmentId,
          studentId: enrollment.student
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

// @desc    Submit grade for a single student
// @route   PUT /api/teacher-tools/enrollments/:enrollmentId/grade
// @access  Private (Teacher)
export const submitStudentGrade = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { grade, autoCalculate = false } = req.body;

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('courseOffering');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, enrollment.courseOffering._id);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    // Check if results are locked
    if (ownership.offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are locked for this course offering'
      });
    }

    // Determine grade
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

    // Validate grade
    if (!GRADE_POINTS.hasOwnProperty(finalGrade)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid grade',
        validGrades: Object.keys(GRADE_POINTS)
      });
    }

    enrollment.grade = finalGrade;
    enrollment.gradePoints = GRADE_POINTS[finalGrade];

    // Update status based on grade
    if (!['I', 'W'].includes(finalGrade)) {
      enrollment.status = finalGrade === 'F' ? 'failed' : 'completed';
      enrollment.completedAt = new Date();
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: 'Grade submitted successfully',
      data: {
        enrollmentId: enrollment._id,
        grade: enrollment.grade,
        gradePoints: enrollment.gradePoints,
        status: enrollment.status
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

// @desc    Submit final grades for entire course offering
// @route   PUT /api/teacher-tools/offerings/:offeringId/submit-grades
// @access  Private (Teacher)
export const submitFinalGrades = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { autoCalculate = true, grades } = req.body; // grades: optional array of { enrollmentId, grade }

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    // Check if results are locked
    if (ownership.offering.resultsLocked) {
      return res.status(400).json({
        success: false,
        message: 'Results are locked for this course offering'
      });
    }

    // Get all active enrollments
    const enrollments = await Enrollment.find({
      courseOffering: offeringId,
      status: { $in: ['enrolled', 'active'] }
    });

    // Create a grade map from provided grades
    const gradeMap = new Map();
    if (grades && Array.isArray(grades)) {
      grades.forEach(g => gradeMap.set(g.enrollmentId.toString(), g.grade));
    }

    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    for (const enrollment of enrollments) {
      try {
        let finalGrade;

        // Check if grade was explicitly provided
        if (gradeMap.has(enrollment._id.toString())) {
          finalGrade = gradeMap.get(enrollment._id.toString());
        } else if (autoCalculate && enrollment.totalMarks !== undefined) {
          finalGrade = calculateGrade(enrollment.totalMarks);
        } else {
          results.skipped.push({
            enrollmentId: enrollment._id,
            reason: 'No grade provided and no total marks for auto-calculation'
          });
          continue;
        }

        // Validate grade
        if (!GRADE_POINTS.hasOwnProperty(finalGrade)) {
          results.failed.push({
            enrollmentId: enrollment._id,
            reason: `Invalid grade: ${finalGrade}`
          });
          continue;
        }

        enrollment.grade = finalGrade;
        enrollment.gradePoints = GRADE_POINTS[finalGrade];

        // Update status
        if (!['I', 'W'].includes(finalGrade)) {
          enrollment.status = finalGrade === 'F' ? 'failed' : 'completed';
          enrollment.completedAt = new Date();
        }

        await enrollment.save();
        results.successful.push({
          enrollmentId: enrollment._id,
          grade: finalGrade,
          gradePoints: GRADE_POINTS[finalGrade]
        });
      } catch (error) {
        results.failed.push({
          enrollmentId: enrollment._id,
          reason: error.message
        });
      }
    }

    // Update offering
    ownership.offering.gradesSubmittedAt = new Date();
    ownership.offering.gradesSubmittedBy = req.user._id;
    await ownership.offering.save();

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

// @desc    Lock results for a course offering
// @route   PUT /api/teacher-tools/offerings/:offeringId/lock-results
// @access  Private (Teacher/Admin)
export const lockResults = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const teacher = await getTeacherFromUser(req.user._id);
    
    // Teachers can only lock their own offerings
    if (teacher) {
      const ownership = await verifyTeacherOwnership(teacher._id, offeringId);
      if (!ownership.valid) {
        return res.status(ownership.status).json({
          success: false,
          message: ownership.error
        });
      }
    }

    const offering = await CourseOffering.findById(offeringId);
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

    // Check if all grades are submitted
    const pendingEnrollments = await Enrollment.countDocuments({
      courseOffering: offeringId,
      status: { $in: ['enrolled', 'active'] },
      grade: { $exists: false }
    });

    if (pendingEnrollments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot lock results. ${pendingEnrollments} student(s) still have pending grades.`
      });
    }

    offering.resultsLocked = true;
    offering.resultsLockedAt = new Date();
    offering.resultsLockedBy = req.user._id;
    offering.status = 'completed';
    await offering.save();

    res.status(200).json({
      success: true,
      message: 'Results locked successfully',
      data: {
        offeringId: offering._id,
        resultsLocked: offering.resultsLocked,
        resultsLockedAt: offering.resultsLockedAt
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

// @desc    Unlock results for a course offering (Admin only)
// @route   PUT /api/teacher-tools/offerings/:offeringId/unlock-results
// @access  Private (Admin only)
export const unlockResults = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { reason } = req.body;

    const offering = await CourseOffering.findById(offeringId);
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

    offering.resultsLocked = false;
    offering.resultsLockedAt = undefined;
    offering.resultsLockedBy = undefined;
    await offering.save();

    // Log the unlock action (you can add audit logging here)
    console.log(`Results unlocked for offering ${offeringId} by user ${req.user._id}. Reason: ${reason || 'Not provided'}`);

    res.status(200).json({
      success: true,
      message: 'Results unlocked successfully',
      data: {
        offeringId: offering._id,
        resultsLocked: offering.resultsLocked
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

// @desc    Get grade summary for a course offering
// @route   GET /api/teacher-tools/offerings/:offeringId/grade-summary
// @access  Private (Teacher)
export const getGradeSummary = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    // Get all enrollments
    const enrollments = await Enrollment.find({
      courseOffering: offeringId,
      status: { $nin: ['dropped'] }
    });

    // Calculate statistics
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
        id: ownership.offering._id,
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

// @desc    Export grades for a course offering
// @route   GET /api/teacher-tools/offerings/:offeringId/export-grades
// @access  Private (Teacher)
export const exportGrades = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { format = 'json' } = req.query;

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    // Get offering details
    const offering = await CourseOffering.findById(offeringId)
      .populate('course', 'courseCode courseName creditHours')
      .populate('program', 'programCode programName');

    // Get all enrollments
    const enrollments = await Enrollment.find({
      courseOffering: offeringId,
      status: { $nin: ['dropped'] }
    })
      .populate({
        path: 'student',
        select: 'studentId userId batch',
        populate: { path: 'userId', select: 'firstName lastName email' }
      })
      .sort({ 'student.studentId': 1 });

    const exportData = enrollments.map((enrollment, index) => ({
      sNo: index + 1,
      studentId: enrollment.student?.studentId,
      name: enrollment.student?.userId 
        ? `${enrollment.student.userId.firstName} ${enrollment.student.userId.lastName}`
        : '',
      email: enrollment.student?.userId?.email,
      batch: enrollment.student?.batch,
      midtermMarks: enrollment.midtermMarks,
      finalMarks: enrollment.finalMarks,
      assignmentMarks: enrollment.assignmentMarks,
      quizMarks: enrollment.quizMarks,
      labMarks: enrollment.labMarks,
      totalMarks: enrollment.totalMarks,
      grade: enrollment.grade,
      gradePoints: enrollment.gradePoints,
      status: enrollment.status,
      remarks: enrollment.remarks
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row => 
        Object.values(row).map(v => `"${v || ''}"`).join(',')
      ).join('\n');
      const csv = `${headers}\n${rows}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${offering.course.courseCode}_grades.csv"`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      offering: {
        courseCode: offering.course.courseCode,
        courseName: offering.course.courseName,
        creditHours: offering.course.creditHours,
        program: offering.program.programCode,
        academicYear: offering.academicYear,
        semesterNumber: offering.semesterNumber,
        section: offering.section,
        resultsLocked: offering.resultsLocked
      },
      count: exportData.length,
      data: exportData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting grades',
      error: error.message
    });
  }
};

// @desc    Get marks template for a course offering
// @route   GET /api/teacher-tools/offerings/:offeringId/marks-template
// @access  Private (Teacher)
export const getMarksTemplate = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const teacher = await getTeacherFromUser(req.user._id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Verify ownership
    const ownership = await verifyTeacherOwnership(teacher._id, offeringId);
    if (!ownership.valid) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error
      });
    }

    // Get all active enrollments
    const enrollments = await Enrollment.find({
      courseOffering: offeringId,
      status: { $in: ['enrolled', 'active'] }
    })
      .populate({
        path: 'student',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'firstName lastName' }
      })
      .sort({ 'student.studentId': 1 });

    const template = enrollments.map(enrollment => ({
      enrollmentId: enrollment._id.toString(),
      studentId: enrollment.student?.studentId,
      name: enrollment.student?.userId 
        ? `${enrollment.student.userId.firstName} ${enrollment.student.userId.lastName}`
        : '',
      midtermMarks: null,
      finalMarks: null,
      assignmentMarks: null,
      quizMarks: null,
      labMarks: null,
      totalMarks: null
    }));

    res.status(200).json({
      success: true,
      message: 'Use this template for bulk marks upload',
      count: template.length,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating marks template',
      error: error.message
    });
  }
};
