/**
 * Validation Middleware for User Management
 * Validates input data for various user operations
 */

/**
 * Validate email format
 */
export const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  next();
};

/**
 * Validate password strength
 * Requirements: Min 8 characters, at least 1 uppercase, 1 lowercase, 1 number
 */
export const validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  // Check minimum length
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least one uppercase letter'
    });
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least one lowercase letter'
    });
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least one number'
    });
  }

  next();
};

/**
 * Validate user registration data
 */
export const validateRegistration = (req, res, next) => {
  const { name, email, password, role } = req.body;
  
  const errors = [];

  // Validate name
  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  // Validate role
  const validRoles = ['student', 'teacher', 'ta', 'admin'];
  if (!role) {
    errors.push('Role is required');
  } else if (!validRoles.includes(role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  // Role-specific validation
  if (role === 'student') {
    const { studentId, enrollmentYear, department } = req.body;
    if (!studentId) errors.push('Student ID is required for students');
    if (!enrollmentYear) errors.push('Enrollment year is required for students');
    if (!department) errors.push('Department is required for students');
  } else if (role === 'teacher') {
    const { employeeId, department } = req.body;
    if (!employeeId) errors.push('Employee ID is required for teachers');
    if (!department) errors.push('Department is required for teachers');
  } else if (role === 'ta') {
    const { studentId } = req.body;
    if (!studentId) errors.push('Student ID is required for TAs (TA must be a student)');
  } else if (role === 'admin') {
    const { employeeId, department } = req.body;
    if (!employeeId) errors.push('Employee ID is required for admins');
    if (!department) errors.push('Department is required for admins');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate user update data
 */
export const validateUserUpdate = (req, res, next) => {
  const { name, email, role } = req.body;
  const errors = [];

  // Validate name if provided
  if (name !== undefined) {
    if (name.trim().length === 0) {
      errors.push('Name cannot be empty');
    } else if (name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
  }

  // Validate email if provided
  if (email !== undefined) {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Don't allow role changes (security risk)
  if (role !== undefined) {
    errors.push('Role cannot be changed after registration');
  }

  // Don't allow password changes through update endpoint
  if (req.body.password !== undefined) {
    errors.push('Password cannot be updated through this endpoint. Use password change endpoint.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive number'
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a number between 1 and 100'
      });
    }
  }

  next();
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} is required`
      });
    }

    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    if (!objectIdRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export const sanitizeInput = (req, res, next) => {
  // List of fields to sanitize
  const fieldsToSanitize = ['name', 'email', 'department', 'designation', 'description'];

  fieldsToSanitize.forEach(field => {
    if (req.body[field]) {
      // Remove HTML tags and special characters
      req.body[field] = req.body[field]
        .toString()
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, ''); // Remove all HTML tags
    }
  });

  next();
};

export default {
  validateEmail,
  validatePassword,
  validateRegistration,
  validateUserUpdate,
  validatePagination,
  validateObjectId,
  sanitizeInput
};
