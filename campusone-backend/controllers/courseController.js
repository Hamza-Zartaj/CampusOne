import Course from '../models/Course.js';

/**
 * @desc    Get all courses with pagination and search
 * @route   GET /api/courses
 * @access  Private/Admin
 */
export const getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      department, 
      program, 
      courseType, 
      isActive, 
      includeSoftDeleted 
    } = req.query;

    // Build query
    const query = {};

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Filter by program
    if (program) {
      query.program = program;
    }

    // Filter by course type
    if (courseType) {
      query.courseType = courseType;
    }

    // Filter by active status
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    // Search by code, name, or description
    if (search) {
      query.$or = [
        { courseCode: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query options
    const queryOptions = includeSoftDeleted === 'true' ? { includeSoftDeleted: true } : {};

    // Get total count
    const total = await Course.countDocuments(query).setOptions(queryOptions);

    // Get courses
    const courses = await Course.find(query)
      .setOptions(queryOptions)
      .populate('department', 'departmentCode name')
      .populate('program', 'programCode name')
      .populate('prerequisites', 'courseCode courseName')
      .sort({ courseCode: 1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: courses.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Private/Admin
 */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .populate('department', 'departmentCode name')
      .populate('program', 'programCode name')
      .populate('prerequisites', 'courseCode courseName creditHours');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
};

/**
 * @desc    Get course by code
 * @route   GET /api/courses/code/:code
 * @access  Private
 */
export const getCourseByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const course = await Course.findOne({ courseCode: code.toUpperCase() })
      .populate('department', 'departmentCode name')
      .populate('program', 'programCode name')
      .populate('prerequisites', 'courseCode courseName creditHours');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
};

/**
 * @desc    Get full prerequisite tree for a course
 * @route   GET /api/courses/:id/prereq-tree
 * @access  Private
 */
export const getPrereqTree = async (req, res) => {
  try {
    const { id } = req.params;
    const visited = new Set();

    // Recursive function to build prereq tree
    const buildPrereqTree = async (courseId, depth = 0, maxDepth = 10) => {
      // Prevent infinite loops and limit depth
      if (visited.has(courseId.toString()) || depth > maxDepth) {
        return null;
      }
      visited.add(courseId.toString());

      const course = await Course.findById(courseId)
        .select('courseCode courseName creditHours courseType prerequisites')
        .lean();

      if (!course) {
        return null;
      }

      const prereqTree = {
        _id: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        creditHours: course.creditHours,
        courseType: course.courseType,
        depth,
        prerequisites: []
      };

      // Recursively get prerequisites
      if (course.prerequisites && course.prerequisites.length > 0) {
        for (const prereqId of course.prerequisites) {
          const prereqTree2 = await buildPrereqTree(prereqId, depth + 1, maxDepth);
          if (prereqTree2) {
            prereqTree.prerequisites.push(prereqTree2);
          }
        }
      }

      return prereqTree;
    };

    const tree = await buildPrereqTree(id);

    if (!tree) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get flat list of all prerequisites for easier processing
    const getAllPrereqs = (node, list = []) => {
      if (node.prerequisites) {
        for (const prereq of node.prerequisites) {
          list.push({
            _id: prereq._id,
            courseCode: prereq.courseCode,
            courseName: prereq.courseName,
            creditHours: prereq.creditHours,
            depth: prereq.depth
          });
          getAllPrereqs(prereq, list);
        }
      }
      return list;
    };

    const flatPrereqs = getAllPrereqs(tree);

    res.status(200).json({
      success: true,
      data: {
        tree,
        flatList: flatPrereqs,
        totalPrereqs: flatPrereqs.length,
        maxDepth: flatPrereqs.length > 0 ? Math.max(...flatPrereqs.map(p => p.depth)) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching prerequisite tree',
      error: error.message
    });
  }
};

/**
 * @desc    Get courses by department
 * @route   GET /api/courses/department/:departmentId
 * @access  Private
 */
export const getCoursesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { isActive, courseType } = req.query;

    const query = { department: departmentId };
    
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (courseType) {
      query.courseType = courseType;
    }

    const courses = await Course.find(query)
      .populate('department', 'departmentCode name')
      .populate('program', 'programCode name')
      .populate('prerequisites', 'courseCode courseName')
      .sort({ courseCode: 1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

/**
 * @desc    Get courses by program
 * @route   GET /api/courses/program/:programId
 * @access  Private
 */
export const getCoursesByProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const { isActive, courseType } = req.query;

    const query = { program: programId };
    
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (courseType) {
      query.courseType = courseType;
    }

    const courses = await Course.find(query)
      .populate('department', 'departmentCode name')
      .populate('program', 'programCode name')
      .populate('prerequisites', 'courseCode courseName')
      .sort({ courseCode: 1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

/**
 * @desc    Create new course
 * @route   POST /api/courses
 * @access  Private/Admin
 */
export const createCourse = async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      description,
      department,
      program,
      creditHours,
      courseType,
      prerequisites
    } = req.body;

    // Check if course code already exists
    const existingCourse = await Course.findOne({ courseCode: courseCode.toUpperCase() })
      .setOptions({ includeSoftDeleted: true });
    
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }

    // Validate prerequisites exist
    if (prerequisites && prerequisites.length > 0) {
      const prereqCourses = await Course.find({ _id: { $in: prerequisites } });
      if (prereqCourses.length !== prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisite courses not found'
        });
      }
    }

    const course = await Course.create({
      courseCode,
      courseName,
      description,
      department,
      program,
      creditHours,
      courseType,
      prerequisites
    });

    // Populate references before returning
    await course.populate([
      { path: 'department', select: 'departmentCode name' },
      { path: 'program', select: 'programCode name' },
      { path: 'prerequisites', select: 'courseCode courseName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error.message
    });
  }
};

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private/Admin
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      courseCode,
      courseName,
      description,
      department,
      program,
      creditHours,
      courseType,
      prerequisites,
      isActive
    } = req.body;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if updating to a code that already exists
    if (courseCode && courseCode.toUpperCase() !== course.courseCode) {
      const existingCourse = await Course.findOne({ 
        courseCode: courseCode.toUpperCase(),
        _id: { $ne: id }
      }).setOptions({ includeSoftDeleted: true });
      
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: 'Course with this code already exists'
        });
      }
    }

    // Validate prerequisites exist and prevent circular dependencies
    if (prerequisites) {
      if (prerequisites.includes(id)) {
        return res.status(400).json({
          success: false,
          message: 'Course cannot be its own prerequisite'
        });
      }
      const prereqCourses = await Course.find({ _id: { $in: prerequisites } });
      if (prereqCourses.length !== prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisite courses not found'
        });
      }
    }

    // Update fields
    if (courseCode) course.courseCode = courseCode;
    if (courseName) course.courseName = courseName;
    if (description !== undefined) course.description = description;
    if (department) course.department = department;
    if (program !== undefined) course.program = program || null;
    if (creditHours) course.creditHours = creditHours;
    if (courseType) course.courseType = courseType;
    if (prerequisites !== undefined) course.prerequisites = prerequisites;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();

    // Populate references before returning
    await course.populate([
      { path: 'department', select: 'departmentCode name' },
      { path: 'program', select: 'programCode name' },
      { path: 'prerequisites', select: 'courseCode courseName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating course',
      error: error.message
    });
  }
};

/**
 * @desc    Delete course (soft delete)
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if this course is a prerequisite for other courses
    const dependentCourses = await Course.find({ prerequisites: id });
    if (dependentCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course. It is a prerequisite for: ${dependentCourses.map(c => c.courseCode).join(', ')}`,
        dependentCourses: dependentCourses.map(c => ({ _id: c._id, courseCode: c.courseCode, courseName: c.courseName }))
      });
    }

    await course.softDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting course',
      error: error.message
    });
  }
};

/**
 * @desc    Restore soft-deleted course
 * @route   POST /api/courses/:id/restore
 * @access  Private/Admin
 */
export const restoreCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id).setOptions({ includeSoftDeleted: true });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Course is not deleted'
      });
    }

    await course.restore();

    // Populate references before returning
    await course.populate([
      { path: 'department', select: 'departmentCode name' },
      { path: 'program', select: 'programCode name' },
      { path: 'prerequisites', select: 'courseCode courseName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Course restored successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error restoring course',
      error: error.message
    });
  }
};

/**
 * @desc    Permanently delete course
 * @route   DELETE /api/courses/:id/permanent
 * @access  Private/Super Admin
 */
export const permanentDeleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id).setOptions({ includeSoftDeleted: true });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if this course is a prerequisite for other courses (including soft-deleted)
    const dependentCourses = await Course.find({ prerequisites: id }).setOptions({ includeSoftDeleted: true });
    if (dependentCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot permanently delete course. It is referenced by: ${dependentCourses.map(c => c.courseCode).join(', ')}`,
        dependentCourses: dependentCourses.map(c => ({ _id: c._id, courseCode: c.courseCode, courseName: c.courseName }))
      });
    }

    await Course.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Course permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting course',
      error: error.message
    });
  }
};
