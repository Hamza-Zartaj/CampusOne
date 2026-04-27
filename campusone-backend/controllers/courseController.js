import prisma from '../prisma/client.js';

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
      isActive 
    } = req.query;

    // Build where clause
    const where = {};

    // Filter by department
    if (department) {
      where.departmentId = department;
    }

    // Filter by program
    if (program) {
      where.programId = program;
    }

    // Filter by course type
    if (courseType) {
      where.courseType = courseType;
    }

    // Filter by active status
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    // Search by code, name, or description
    if (search) {
      where.OR = [
        { courseCode: { contains: search, mode: 'insensitive' } },
        { courseName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.course.count({ where });

    // Get courses
    const courses = await prisma.course.findMany({
      where,
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true } } } }
      },
      orderBy: { courseCode: 'asc' },
      skip,
      take: limitNum
    });

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

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true, creditHours: true } } } }
      }
    });

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

    const course = await prisma.course.findUnique({
      where: { courseCode: code.toUpperCase() },
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true, creditHours: true } } } }
      }
    });

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
      if (visited.has(courseId) || depth > maxDepth) {
        return null;
      }
      visited.add(courseId);

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          courseCode: true,
          courseName: true,
          creditHours: true,
          courseType: true,
          prerequisites: { include: { prerequisite: { select: { id: true } } } }
        }
      });

      if (!course) {
        return null;
      }

      const prereqTree = {
        id: course.id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        creditHours: course.creditHours,
        courseType: course.courseType,
        depth,
        prerequisites: []
      };

      // Recursively get prerequisites
      if (course.prerequisites && course.prerequisites.length > 0) {
        for (const prereqEntry of course.prerequisites) {
          const prereqTree2 = await buildPrereqTree(prereqEntry.prerequisite.id, depth + 1, maxDepth);
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
            id: prereq.id,
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

    const where = { departmentId };
    
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (courseType) {
      where.courseType = courseType;
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true } } } }
      },
      orderBy: { courseCode: 'asc' }
    });

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

    const where = { programId };
    
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (courseType) {
      where.courseType = courseType;
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true } } } }
      },
      orderBy: { courseCode: 'asc' }
    });

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
      departmentId,
      programId,
      creditHours,
      courseType,
      prerequisites
    } = req.body;

    // Check if course code already exists
    const existingCourse = await prisma.course.findUnique({
      where: { courseCode: courseCode.toUpperCase() }
    });
    
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }

    // Validate prerequisites exist
    if (prerequisites && prerequisites.length > 0) {
      const prereqCourses = await prisma.course.findMany({
        where: { id: { in: prerequisites } }
      });
      if (prereqCourses.length !== prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisite courses not found'
        });
      }
    }

    const course = await prisma.course.create({
      data: {
        courseCode: courseCode.toUpperCase(),
        courseName,
        description,
        departmentId,
        programId: programId || null,
        creditHours: parseInt(creditHours),
        courseType
      },
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true } } } }
      }
    });

    // Create prerequisite entries
    if (prerequisites && prerequisites.length > 0) {
      await prisma.coursePrerequisite.createMany({
        data: prerequisites.map(prereqId => ({ courseId: course.id, prerequisiteId: prereqId })),
        skipDuplicates: true
      });
    }

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Department or Program not found'
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Course code must be unique'
      });
    }
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
      departmentId,
      programId,
      creditHours,
      courseType,
      prerequisites,
      isActive
    } = req.body;

    const course = await prisma.course.findUnique({ where: { id } });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if updating to a code that already exists
    if (courseCode && courseCode.toUpperCase() !== course.courseCode) {
      const existingCourse = await prisma.course.findUnique({
        where: { courseCode: courseCode.toUpperCase() }
      });
      
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
      const prereqCourses = await prisma.course.findMany({
        where: { id: { in: prerequisites } }
      });
      if (prereqCourses.length !== prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisite courses not found'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (courseCode) updateData.courseCode = courseCode.toUpperCase();
    if (courseName) updateData.courseName = courseName;
    if (description !== undefined) updateData.description = description;
    if (departmentId) updateData.departmentId = departmentId;
    if (programId !== undefined) updateData.programId = programId || null;
    if (creditHours) updateData.creditHours = parseInt(creditHours);
    if (courseType) updateData.courseType = courseType;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true } } } }
      }
    });

    // Update prerequisites if provided
    if (prerequisites !== undefined) {
      await prisma.coursePrerequisite.deleteMany({ where: { courseId: id } });
      if (prerequisites.length > 0) {
        await prisma.coursePrerequisite.createMany({
          data: prerequisites.map(prereqId => ({ courseId: id, prerequisiteId: prereqId })),
          skipDuplicates: true
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course, Department, or Program not found'
      });
    }
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

    const course = await prisma.course.findUnique({ where: { id } });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if this course is a prerequisite for other courses
    const dependentCourses = await prisma.coursePrerequisite.findMany({
      where: { prerequisiteId: id },
      include: { course: { select: { id: true, courseCode: true, courseName: true } } }
    });

    if (dependentCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course. It is a prerequisite for: ${dependentCourses.map(d => d.course.courseCode).join(', ')}`,
        dependentCourses: dependentCourses.map(d => ({ id: d.course.id, courseCode: d.course.courseCode, courseName: d.course.courseName }))
      });
    }

    // Soft delete
    const deletedCourse = await prisma.course.update({
      where: { id },
      data: { isActive: false }
    });

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
      data: deletedCourse
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
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

    const course = await prisma.course.findUnique({ where: { id } });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Course is not deleted'
      });
    }

    const restoredCourse = await prisma.course.update({
      where: { id },
      data: { isActive: true },
      include: {
        department: { select: { id: true, departmentCode: true, name: true } },
        program: { select: { id: true, programCode: true, name: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, courseCode: true, courseName: true } } } }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Course restored successfully',
      data: restoredCourse
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

    const course = await prisma.course.findUnique({ where: { id } });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if this course is a prerequisite for other courses
    const dependentCourses = await prisma.course.findMany({
      where: {
        prerequisites: {
          some: { id }
        }
      }
    });

    if (dependentCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot permanently delete course. It is referenced by: ${dependentCourses.map(c => c.courseCode).join(', ')}`,
        dependentCourses: dependentCourses.map(c => ({ id: c.id, courseCode: c.courseCode, courseName: c.courseName }))
      });
    }

    await prisma.course.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Course permanently deleted'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting course',
      error: error.message
    });
  }
};

