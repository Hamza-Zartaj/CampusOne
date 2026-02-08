/**
 * Semester Incharge Authorization Middleware
 * Provides scope-based authorization for semester incharges
 */

import SemesterIncharge from '../models/SemesterIncharge.js';
import Teacher from '../models/Teacher.js';

/**
 * Check if user is an active semester incharge
 * Attaches incharge scope to req.inchargeScope if found
 */
export const checkInchargeStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login first.'
      });
    }

    // Skip for admins - they have full access
    if (req.user.role === 'admin') {
      req.isIncharge = false;
      req.inchargeScope = [];
      return next();
    }

    // Only teachers can be incharges
    if (req.user.role !== 'teacher') {
      req.isIncharge = false;
      req.inchargeScope = [];
      return next();
    }

    // Find teacher profile
    const teacher = await Teacher.findOne({ userId: req.user._id });
    
    if (!teacher) {
      req.isIncharge = false;
      req.inchargeScope = [];
      return next();
    }

    // Find all active incharge assignments for this teacher
    const inchargeAssignments = await SemesterIncharge.find({
      teacher: teacher._id,
      status: 'active'
    }).populate('program', 'programCode name');

    if (inchargeAssignments.length === 0) {
      req.isIncharge = false;
      req.inchargeScope = [];
      return next();
    }

    req.isIncharge = true;
    req.teacherId = teacher._id;
    req.inchargeScope = inchargeAssignments.map(assignment => ({
      inchargeId: assignment._id,
      program: assignment.program._id,
      programCode: assignment.program.programCode,
      programName: assignment.program.name,
      department: assignment.department,
      batch: assignment.batch,
      academicYear: assignment.academicYear,
      semesterNumber: assignment.semesterNumber
    }));

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking incharge status',
      error: error.message
    });
  }
};

/**
 * Authorize access based on incharge scope
 * Must be used after checkInchargeStatus middleware
 * 
 * @param {Object} options - Authorization options
 * @param {boolean} options.allowAdmin - Allow admins to bypass (default: true)
 * @param {string} options.programParam - Request param name for program ID
 * @param {string} options.batchParam - Request param name for batch
 * @param {string} options.academicYearParam - Request param/query for academic year
 * @param {string} options.semesterParam - Request param/query for semester number
 */
export const authorizeInchargeScope = (options = {}) => {
  const {
    allowAdmin = true,
    programParam = 'programId',
    batchParam = 'batch',
    academicYearParam = 'academicYear',
    semesterParam = 'semesterNumber'
  } = options;

  return async (req, res, next) => {
    try {
      // Allow admins if configured
      if (allowAdmin && req.user.role === 'admin') {
        return next();
      }

      // Check if user is an incharge
      if (!req.isIncharge || !req.inchargeScope || req.inchargeScope.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a semester incharge.'
        });
      }

      // Extract scope parameters from request
      const programId = req.params[programParam] || req.query[programParam] || req.body.program;
      const batch = req.params[batchParam] || req.query[batchParam] || req.body.batch;
      const academicYear = req.params[academicYearParam] || req.query[academicYearParam] || req.body.academicYear;
      const semesterNumber = parseInt(
        req.params[semesterParam] || req.query[semesterParam] || req.body.semesterNumber
      );

      // Check if any incharge scope matches the request
      const hasAccess = req.inchargeScope.some(scope => {
        let matches = true;

        if (programId && scope.program.toString() !== programId.toString()) {
          matches = false;
        }
        if (batch && scope.batch !== batch) {
          matches = false;
        }
        if (academicYear && scope.academicYear !== academicYear) {
          matches = false;
        }
        if (semesterNumber && scope.semesterNumber !== semesterNumber) {
          matches = false;
        }

        return matches;
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the incharge for this scope.',
          requiredScope: { programId, batch, academicYear, semesterNumber },
          yourScope: req.inchargeScope
        });
      }

      // Attach matching scope for downstream use
      req.matchingScope = req.inchargeScope.filter(scope => {
        let matches = true;
        if (programId && scope.program.toString() !== programId.toString()) matches = false;
        if (batch && scope.batch !== batch) matches = false;
        if (academicYear && scope.academicYear !== academicYear) matches = false;
        if (semesterNumber && scope.semesterNumber !== semesterNumber) matches = false;
        return matches;
      });

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error authorizing incharge scope',
        error: error.message
      });
    }
  };
};

/**
 * Authorize based on program only
 * Useful for program-level operations
 */
export const authorizeInchargeProgram = (programParam = 'programId') => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return next();
      }

      if (!req.isIncharge || !req.inchargeScope || req.inchargeScope.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a semester incharge.'
        });
      }

      const programId = req.params[programParam] || req.query[programParam] || req.body.program;

      if (!programId) {
        return res.status(400).json({
          success: false,
          message: 'Program ID is required'
        });
      }

      const hasAccess = req.inchargeScope.some(
        scope => scope.program.toString() === programId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not an incharge for this program.'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error authorizing incharge program scope',
        error: error.message
      });
    }
  };
};

/**
 * Authorize based on department
 * Useful for department-level operations
 */
export const authorizeInchargeDepartment = (departmentParam = 'departmentId') => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return next();
      }

      if (!req.isIncharge || !req.inchargeScope || req.inchargeScope.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a semester incharge.'
        });
      }

      const departmentId = req.params[departmentParam] || req.query[departmentParam] || req.body.department;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      const hasAccess = req.inchargeScope.some(
        scope => scope.department && scope.department.toString() === departmentId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not an incharge for this department.'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error authorizing incharge department scope',
        error: error.message
      });
    }
  };
};

/**
 * Check if user is incharge or admin
 * Simple check without scope validation
 */
export const requireInchargeOrAdmin = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }

    if (!req.isIncharge) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or semester incharge access required.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking authorization',
      error: error.message
    });
  }
};

/**
 * Get incharge scope from request
 * Helper middleware to extract and validate scope from various sources
 */
export const extractInchargeScope = async (req, res, next) => {
  try {
    // Extract scope from body, params, or query
    req.requestedScope = {
      program: req.body.program || req.params.programId || req.query.program,
      batch: req.body.batch || req.params.batch || req.query.batch,
      academicYear: req.body.academicYear || req.params.academicYear || req.query.academicYear,
      semesterNumber: parseInt(req.body.semesterNumber || req.params.semesterNumber || req.query.semesterNumber) || null
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error extracting incharge scope',
      error: error.message
    });
  }
};

export default {
  checkInchargeStatus,
  authorizeInchargeScope,
  authorizeInchargeProgram,
  authorizeInchargeDepartment,
  requireInchargeOrAdmin,
  extractInchargeScope
};
