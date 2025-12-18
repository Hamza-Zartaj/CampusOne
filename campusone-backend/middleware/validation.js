// Validation middleware for user input

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation: at least 8 characters, one uppercase, one lowercase, one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// @desc    Validate user registration/creation
export const validateUser = (req, res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  // Validate name
  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (name.trim().length > 100) {
    errors.push('Name must not exceed 100 characters');
  }

  // Validate email
  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }

  // Validate password
  if (!password || password.length === 0) {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (!passwordRegex.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  } else if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Validate role
  if (!role) {
    errors.push('Role is required');
  } else {
    const validRoles = ['student', 'teacher', 'ta', 'admin'];
    if (!validRoles.includes(role)) {
      errors.push('Invalid role. Must be student, teacher, ta, or admin');
    }
  }

  // Role-specific validation
  if (role === 'student' || role === 'ta') {
    const { enrollmentNumber, department } = req.body;
    
    if (!enrollmentNumber || enrollmentNumber.trim().length === 0) {
      errors.push('Enrollment number is required for students and TAs');
    } else if (enrollmentNumber.trim().length > 50) {
      errors.push('Enrollment number must not exceed 50 characters');
    }

    if (!department || department.trim().length === 0) {
      errors.push('Department is required for students and TAs');
    } else if (department.trim().length > 100) {
      errors.push('Department must not exceed 100 characters');
    }
  }

  if (role === 'teacher') {
    const { employeeId, department } = req.body;
    
    if (!employeeId || employeeId.trim().length === 0) {
      errors.push('Employee ID is required for teachers');
    } else if (employeeId.trim().length > 50) {
      errors.push('Employee ID must not exceed 50 characters');
    }

    if (!department || department.trim().length === 0) {
      errors.push('Department is required for teachers');
    } else if (department.trim().length > 100) {
      errors.push('Department must not exceed 100 characters');
    }
  }

  // Optional field validation
  const { phone, batch, qualification, specialization } = req.body;

  if (phone && phone.trim().length > 20) {
    errors.push('Phone number must not exceed 20 characters');
  }

  if (batch && batch.trim().length > 20) {
    errors.push('Batch must not exceed 20 characters');
  }

  if (qualification && qualification.trim().length > 200) {
    errors.push('Qualification must not exceed 200 characters');
  }

  if (specialization && specialization.trim().length > 200) {
    errors.push('Specialization must not exceed 200 characters');
  }

  // If there are errors, return them
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Validation passed
  next();
};

// @desc    Validate user update
export const validateUpdateUser = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  // Validate name if provided
  if (name !== undefined) {
    if (name.trim().length === 0) {
      errors.push('Name cannot be empty');
    } else if (name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    } else if (name.trim().length > 100) {
      errors.push('Name must not exceed 100 characters');
    }
  }

  // Validate email if provided
  if (email !== undefined) {
    if (email.trim().length === 0) {
      errors.push('Email cannot be empty');
    } else if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Password updates should be done through a separate route
  if (password !== undefined) {
    errors.push('Password cannot be updated through this route. Use the change password endpoint.');
  }

  // Optional field validation
  const { phone, batch, qualification, specialization } = req.body;

  if (phone && phone.trim().length > 20) {
    errors.push('Phone number must not exceed 20 characters');
  }

  if (batch && batch.trim().length > 20) {
    errors.push('Batch must not exceed 20 characters');
  }

  if (qualification && qualification.trim().length > 200) {
    errors.push('Qualification must not exceed 200 characters');
  }

  if (specialization && specialization.trim().length > 200) {
    errors.push('Specialization must not exceed 200 characters');
  }

  // If there are errors, return them
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Validation passed
  next();
};

// @desc    Validate email format
export const validateEmail = (email) => {
  return emailRegex.test(email);
};

// @desc    Validate password strength
export const validatePassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!passwordRegex.test(password)) {
    return { 
      valid: false, 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
    };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters' };
  }
  
  return { valid: true };
};

// @desc    Validate assignment submission
export const validateAssignment = (req, res, next) => {
  const { title, description, courseId, dueDate } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Assignment title is required');
  } else if (title.trim().length > 200) {
    errors.push('Title must not exceed 200 characters');
  }

  if (!description || description.trim().length === 0) {
    errors.push('Assignment description is required');
  } else if (description.trim().length > 5000) {
    errors.push('Description must not exceed 5000 characters');
  }

  if (!courseId) {
    errors.push('Course ID is required');
  }

  if (!dueDate) {
    errors.push('Due date is required');
  } else {
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) {
      errors.push('Invalid due date format');
    } else if (due < new Date()) {
      errors.push('Due date must be in the future');
    }
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

// @desc    Validate course creation
export const validateCourse = (req, res, next) => {
  const { code, name, description, credits, semester } = req.body;
  const errors = [];

  if (!code || code.trim().length === 0) {
    errors.push('Course code is required');
  } else if (code.trim().length > 20) {
    errors.push('Course code must not exceed 20 characters');
  }

  if (!name || name.trim().length === 0) {
    errors.push('Course name is required');
  } else if (name.trim().length > 200) {
    errors.push('Course name must not exceed 200 characters');
  }

  if (description && description.trim().length > 2000) {
    errors.push('Description must not exceed 2000 characters');
  }

  if (credits !== undefined) {
    if (typeof credits !== 'number' || credits < 0 || credits > 10) {
      errors.push('Credits must be a number between 0 and 10');
    }
  }

  if (semester !== undefined) {
    if (typeof semester !== 'number' || semester < 1 || semester > 12) {
      errors.push('Semester must be a number between 1 and 12');
    }
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

// @desc    Validate announcement
export const validateAnnouncement = (req, res, next) => {
  const { title, content, courseId } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Announcement title is required');
  } else if (title.trim().length > 200) {
    errors.push('Title must not exceed 200 characters');
  }

  if (!content || content.trim().length === 0) {
    errors.push('Announcement content is required');
  } else if (content.trim().length > 5000) {
    errors.push('Content must not exceed 5000 characters');
  }

  if (!courseId) {
    errors.push('Course ID is required');
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
