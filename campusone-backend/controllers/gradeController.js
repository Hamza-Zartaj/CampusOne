import Grade from '../models/Grade.js';
import Enrollment from '../models/Enrollment.js';
import CourseOffering from '../models/CourseOffering.js';

/**
 * @desc    Create or update grade for enrollment
 * @route   POST /api/grades
 * @access  Teacher, Admin, SuperAdmin
 */
export const createGrade = async (req, res) => {
  try {
    const { enrollmentId, letterGrade, percentage, components, remarks } = req.body;

    // Validate enrollment exists
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate({
        path: 'courseOfferingId',
        populate: { path: 'courseId', select: 'creditHours' }
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if user is assigned teacher (if teacher role)
    if (req.user.role === 'teacher') {
      const offering = await CourseOffering.findById(enrollment.courseOfferingId._id);
      if (offering.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only grade students in your assigned courses'
        });
      }
    }

    // Calculate grade points
    let gradePoints;
    let finalLetterGrade = letterGrade;

    if (percentage !== undefined && !letterGrade) {
      // Calculate letter grade from percentage
      finalLetterGrade = Grade.getLetterGrade(percentage);
    }

    gradePoints = Grade.getGradePoints(finalLetterGrade);

    // Check if grade already exists
    let grade = await Grade.findOne({ enrollmentId });

    if (grade) {
      // Update existing grade
      grade.letterGrade = finalLetterGrade;
      grade.gradePoints = gradePoints;
      grade.percentage = percentage;
      if (components) grade.components = components;
      grade.remarks = remarks;
      grade.gradedBy = req.user._id;
      grade.finalizedAt = new Date();
      await grade.save();
    } else {
      // Create new grade
      grade = await Grade.create({
        enrollmentId,
        letterGrade: finalLetterGrade,
        gradePoints,
        percentage,
        components,
        gradedBy: req.user._id,
        remarks
      });
    }

    // Update enrollment status based on grade
    if (['F'].includes(finalLetterGrade)) {
      enrollment.status = 'failed';
    } else if (!['W', 'I'].includes(finalLetterGrade)) {
      enrollment.status = 'completed';
    }
    enrollment.completedAt = new Date();
    await enrollment.save();

    const populated = await Grade.findById(grade._id)
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'studentId', select: 'name email studentId' },
          {
            path: 'courseOfferingId',
            populate: { path: 'courseId', select: 'courseCode courseName' }
          }
        ]
      })
      .populate('gradedBy', 'name');

    res.status(201).json({
      success: true,
      message: grade.isNew ? 'Grade created successfully' : 'Grade updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating/updating grade',
      error: error.message
    });
  }
};

/**
 * @desc    Get all grades (with filters)
 * @route   GET /api/grades
 * @access  Admin, SuperAdmin
 */
export const getGrades = async (req, res) => {
  try {
    const { enrollmentId, isFinalized } = req.query;
    
    const filter = {};
    if (enrollmentId) filter.enrollmentId = enrollmentId;
    if (isFinalized !== undefined) filter.isFinalized = isFinalized === 'true';

    const grades = await Grade.find(filter)
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'studentId', select: 'name email studentId' },
          {
            path: 'courseOfferingId',
            populate: [
              { path: 'courseId', select: 'courseCode courseName creditHours' },
              { path: 'academicTermId', select: 'name' }
            ]
          }
        ]
      })
      .populate('gradedBy', 'name')
      .sort({ finalizedAt: -1 });

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

/**
 * @desc    Get grade by enrollment ID
 * @route   GET /api/grades/enrollment/:enrollmentId
 * @access  Student (own), Teacher (assigned), Admin, SuperAdmin
 */
export const getGradeByEnrollment = async (req, res) => {
  try {
    const enrollmentId = req.params.enrollmentId;

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Students can only view their own grades
    if (req.user.role === 'student' && enrollment.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own grades'
      });
    }

    // Teachers can only view grades for their courses
    if (req.user.role === 'teacher') {
      const offering = await CourseOffering.findById(enrollment.courseOfferingId);
      if (offering.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view grades for your assigned courses'
        });
      }
    }

    const grade = await Grade.findOne({ enrollmentId })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'studentId', select: 'name email studentId' },
          {
            path: 'courseOfferingId',
            populate: { path: 'courseId', select: 'courseCode courseName creditHours' }
          }
        ]
      })
      .populate('gradedBy', 'name');

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found for this enrollment'
      });
    }

    res.status(200).json({
      success: true,
      data: grade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching grade',
      error: error.message
    });
  }
};

/**
 * @desc    Get student's all grades
 * @route   GET /api/grades/student/:studentId
 * @access  Student (own), Admin, SuperAdmin
 */
export const getStudentGrades = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Students can only view their own grades
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own grades'
      });
    }

    // Get all enrollments for student
    const enrollments = await Enrollment.find({ studentId }).select('_id');
    const enrollmentIds = enrollments.map(e => e._id);

    const grades = await Grade.find({ enrollmentId: { $in: enrollmentIds } })
      .populate({
        path: 'enrollmentId',
        populate: {
          path: 'courseOfferingId',
          populate: [
            { path: 'courseId', select: 'courseCode courseName creditHours' },
            { path: 'academicTermId', select: 'name termType year' }
          ]
        }
      })
      .sort({ finalizedAt: -1 });

    // Calculate CGPA
    let totalCreditHours = 0;
    let totalGradePoints = 0;

    grades.forEach(grade => {
      if (!['W', 'I', 'P', 'NP'].includes(grade.letterGrade)) {
        const creditHours = grade.enrollmentId?.courseOfferingId?.courseId?.creditHours || 0;
        totalCreditHours += creditHours;
        totalGradePoints += grade.gradePoints * creditHours;
      }
    });

    const cgpa = totalCreditHours > 0 ? (totalGradePoints / totalCreditHours).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      count: grades.length,
      cgpa: parseFloat(cgpa),
      totalCreditHours,
      data: grades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student grades',
      error: error.message
    });
  }
};

/**
 * @desc    Get grades for a course offering
 * @route   GET /api/grades/offering/:offeringId
 * @access  Teacher (assigned), Admin, SuperAdmin
 */
export const getOfferingGrades = async (req, res) => {
  try {
    const offeringId = req.params.offeringId;

    // Check if user is assigned teacher (if teacher role)
    if (req.user.role === 'teacher') {
      const offering = await CourseOffering.findById(offeringId);
      if (!offering || offering.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view grades for your assigned courses'
        });
      }
    }

    // Get all enrollments for this offering
    const enrollments = await Enrollment.find({ courseOfferingId: offeringId }).select('_id');
    const enrollmentIds = enrollments.map(e => e._id);

    const grades = await Grade.find({ enrollmentId: { $in: enrollmentIds } })
      .populate({
        path: 'enrollmentId',
        populate: { path: 'studentId', select: 'name email studentId' }
      })
      .sort({ 'enrollmentId.studentId.name': 1 });

    res.status(200).json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching offering grades',
      error: error.message
    });
  }
};

/**
 * @desc    Finalize grade
 * @route   PUT /api/grades/:id/finalize
 * @access  Teacher, Admin, SuperAdmin
 */
export const finalizeGrade = async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id)
      .populate('enrollmentId');

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Check if user is assigned teacher (if teacher role)
    if (req.user.role === 'teacher') {
      const offering = await CourseOffering.findById(grade.enrollmentId.courseOfferingId);
      if (offering.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only finalize grades for your assigned courses'
        });
      }
    }

    grade.isFinalized = true;
    grade.finalizedAt = new Date();
    await grade.save();

    res.status(200).json({
      success: true,
      message: 'Grade finalized successfully',
      data: grade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finalizing grade',
      error: error.message
    });
  }
};

/**
 * @desc    Update grade
 * @route   PUT /api/grades/:id
 * @access  Teacher, Admin, SuperAdmin
 */
export const updateGrade = async (req, res) => {
  try {
    const { letterGrade, percentage, components, remarks } = req.body;

    const grade = await Grade.findById(req.params.id)
      .populate('enrollmentId');

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Check if finalized
    if (grade.isFinalized && req.user.role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify finalized grade. Contact SuperAdmin.'
      });
    }

    // Check if user is assigned teacher (if teacher role)
    if (req.user.role === 'teacher') {
      const offering = await CourseOffering.findById(grade.enrollmentId.courseOfferingId);
      if (offering.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update grades for your assigned courses'
        });
      }
    }

    // Calculate grade points
    let finalLetterGrade = letterGrade || grade.letterGrade;
    if (percentage !== undefined && !letterGrade) {
      finalLetterGrade = Grade.getLetterGrade(percentage);
    }
    const gradePoints = Grade.getGradePoints(finalLetterGrade);

    grade.letterGrade = finalLetterGrade;
    grade.gradePoints = gradePoints;
    if (percentage !== undefined) grade.percentage = percentage;
    if (components) grade.components = components;
    if (remarks !== undefined) grade.remarks = remarks;
    grade.gradedBy = req.user._id;
    await grade.save();

    // Update enrollment status
    const enrollment = await Enrollment.findById(grade.enrollmentId._id);
    if (['F'].includes(finalLetterGrade)) {
      enrollment.status = 'failed';
    } else if (!['W', 'I'].includes(finalLetterGrade)) {
      enrollment.status = 'completed';
    }
    await enrollment.save();

    const populated = await Grade.findById(grade._id)
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'studentId', select: 'name email studentId' },
          {
            path: 'courseOfferingId',
            populate: { path: 'courseId', select: 'courseCode courseName' }
          }
        ]
      })
      .populate('gradedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Grade updated successfully',
      data: populated
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
 * @desc    Delete grade
 * @route   DELETE /api/grades/:id
 * @access  Admin, SuperAdmin
 */
export const deleteGrade = async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    if (grade.isFinalized && req.user.role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete finalized grade. Contact SuperAdmin.'
      });
    }

    // Reset enrollment status
    await Enrollment.findByIdAndUpdate(grade.enrollmentId, {
      status: 'enrolled',
      completedAt: null
    });

    await Grade.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Grade deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting grade',
      error: error.message
    });
  }
};
