/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides granular permission control for LMS operations
 */

// Role hierarchy: superadmin > admin > teacher > ta > student
const roleHierarchy = {
  superadmin: 5,
  admin: 4,
  teacher: 3,
  ta: 2,
  student: 1
};

/**
 * Check if user has minimum required role level
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Minimum required role
 * @returns {boolean}
 */
const hasMinimumRole = (userRole, requiredRole) => {
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
};

/**
 * Middleware to check if user has required role(s)
 * Usage: requireRole('admin', 'superadmin')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has minimum role level
 * Usage: requireMinRole('teacher') - allows teacher, admin, superadmin
 */
export const requireMinRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.'
      });
    }

    if (!hasMinimumRole(req.user.role, minimumRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum required role: ${minimumRole}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

/**
 * Middleware for SuperAdmin-only routes
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. SuperAdmin privileges required.'
    });
  }

  next();
};

/**
 * Middleware for Admin or SuperAdmin routes
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }

  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

/**
 * Middleware for Teacher, Admin, or SuperAdmin routes
 */
export const requireTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }

  if (!['teacher', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher privileges required.'
    });
  }

  next();
};

/**
 * Middleware for TA, Teacher, Admin, or SuperAdmin routes
 */
export const requireTA = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }

  if (!['ta', 'teacher', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. TA privileges required.'
    });
  }

  next();
};

/**
 * Middleware to check if user owns the resource or has admin access
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 */
export const requireOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.'
      });
    }

    // Admins and superadmins can access any resource
    if (['admin', 'superadmin'].includes(req.user.role)) {
      return next();
    }

    try {
      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found.'
        });
      }

      if (ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this resource.'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership.',
        error: error.message
      });
    }
  };
};

/**
 * Permission definitions for different resources
 */
export const permissions = {
  // Program management
  program: {
    create: ['superadmin', 'admin'],
    read: ['superadmin', 'admin', 'teacher', 'ta', 'student'],
    update: ['superadmin', 'admin'],
    delete: ['superadmin']
  },
  // Course catalog management
  courseCatalog: {
    create: ['superadmin', 'admin'],
    read: ['superadmin', 'admin', 'teacher', 'ta', 'student'],
    update: ['superadmin', 'admin'],
    delete: ['superadmin']
  },
  // Curriculum management
  curriculum: {
    create: ['superadmin', 'admin'],
    read: ['superadmin', 'admin', 'teacher', 'ta', 'student'],
    update: ['superadmin', 'admin'],
    delete: ['superadmin', 'admin']
  },
  // Academic term management
  academicTerm: {
    create: ['superadmin', 'admin'],
    read: ['superadmin', 'admin', 'teacher', 'ta', 'student'],
    update: ['superadmin', 'admin'],
    delete: ['superadmin']
  },
  // Course offering management
  courseOffering: {
    create: ['superadmin', 'admin'],
    read: ['superadmin', 'admin', 'teacher', 'ta', 'student'],
    update: ['superadmin', 'admin', 'teacher'],
    delete: ['superadmin', 'admin']
  },
  // Enrollment management
  enrollment: {
    create: ['superadmin', 'admin'],
    read: ['superadmin', 'admin', 'teacher', 'ta', 'student'],
    update: ['superadmin', 'admin'],
    delete: ['superadmin', 'admin']
  },
  // Grade management
  grade: {
    create: ['superadmin', 'admin', 'teacher'],
    read: ['superadmin', 'admin', 'teacher', 'ta', 'student'],
    update: ['superadmin', 'admin', 'teacher'],
    delete: ['superadmin', 'admin']
  },
  // User management
  user: {
    create: ['superadmin', 'admin'],
    read: ['superadmin', 'admin'],
    update: ['superadmin', 'admin'],
    delete: ['superadmin']
  }
};

/**
 * Middleware factory for permission-based access
 * Usage: checkPermission('program', 'create')
 */
export const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.'
      });
    }

    const allowedRoles = permissions[resource]?.[action];
    
    if (!allowedRoles) {
      return res.status(500).json({
        success: false,
        message: `Permission not defined for ${resource}.${action}`
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Cannot ${action} ${resource}. Required role(s): ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

export default {
  requireRole,
  requireMinRole,
  requireSuperAdmin,
  requireAdmin,
  requireTeacher,
  requireTA,
  requireOwnerOrAdmin,
  checkPermission,
  permissions
};
