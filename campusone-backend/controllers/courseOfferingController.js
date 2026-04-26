import prisma from '../prisma/client.js';

/**
 * @desc    Get all course offerings with pagination and filters
 * @route   GET /api/course-offerings
 * @access  Private/Admin
 */
export const getAllCourseOfferings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search,
      course,
      program,
      academicYear, 
      semesterNumber,
      teacher,
      status,
      enrollmentStatus,
      isActive
    } = req.query;

    // Build where clause
    const where = {};

    if (course) where.courseId = course;
    if (program) where.programId = program;
    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);
    if (teacher) where.teacherId = teacher;
    if (status) where.status = status;
    if (enrollmentStatus) where.enrollmentStatus = enrollmentStatus;
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.courseOffering.count({ where });

    // Get course offerings
    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } },
        program: { select: { id: true, programCode: true, name: true } },
        teacher: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        },
        tas: {
          select: {
            id: true,
            studentId: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: [
        { academicYear: 'desc' },
        { semesterNumber: 'asc' },
        { 'course.courseCode': 'asc' }
      ],
      skip,
      take: limitNum
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: offerings.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      data: offerings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course offerings',
      error: error.message
    });
  }
};

/**
 * @desc    Get course offerings by program, academic year, and semester
 * @route   GET /api/course-offerings/program/:programId/semester
 * @access  Private
 */
export const getOfferingsByProgramSemester = async (req, res) => {
  try {
    const { programId } = req.params;
    const { academicYear, semesterNumber, status, enrollmentStatus } = req.query;

    const where = { programId };

    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);
    if (status) where.status = status;
    if (enrollmentStatus) where.enrollmentStatus = enrollmentStatus;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: { 
          select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true, domain: true } 
        },
        program: { select: { id: true, programCode: true, name: true } },
        teacher: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        },
        tas: {
          select: {
            id: true,
            studentId: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { 'course.courseCode': 'asc' }
    });

    res.status(200).json({
      success: true,
      count: offerings.length,
      data: offerings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course offerings',
      error: error.message
    });
  }
};

/**
 * @desc    Get single course offering by ID
 * @route   GET /api/course-offerings/:id
 * @access  Private
 */
export const getCourseOfferingById = async (req, res) => {
  try {
    const { id } = req.params;

    const offering = await prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
            creditHours: true,
            courseType: true,
            domain: true,
            description: true,
            prerequisites: { select: { id: true, courseCode: true, courseName: true } }
          }
        },
        program: { select: { id: true, programCode: true, name: true, departmentId: true } },
        teacher: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            officeRoom: true,
            officeHours: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        },
        tas: {
          select: {
            id: true,
            studentId: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    res.status(200).json({
      success: true,
      data: offering
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Create new course offering
 * @route   POST /api/course-offerings
 * @access  Private/Admin
 */
export const createCourseOffering = async (req, res) => {
  try {
    const {
      courseId,
      programId,
      academicYear,
      semesterNumber,
      semesterName,
      section,
      teacherId,
      tas,
      maxCapacity,
      schedule,
      enrollmentStatus,
      status,
      startDate,
      endDate
    } = req.body;

    // Validate required references
    const [courseDoc, programDoc, teacherDoc] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.program.findUnique({ where: { id: programId } }),
      prisma.teacher.findUnique({ where: { id: teacherId } })
    ]);

    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!programDoc) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Validate TAs if provided
    if (tas && tas.length > 0) {
      const taCount = await prisma.ta.count({
        where: { id: { in: tas } }
      });
      if (taCount !== tas.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found'
        });
      }
    }

    // Check for duplicate offering
    const existingOffering = await prisma.courseOffering.findFirst({
      where: {
        courseId,
        programId,
        academicYear,
        semesterNumber,
        section: section || 'A'
      }
    });

    if (existingOffering) {
      return res.status(400).json({
        success: false,
        message: 'Course offering already exists for this combination'
      });
    }

    const offering = await prisma.courseOffering.create({
      data: {
        courseId,
        programId,
        academicYear,
        semesterNumber,
        semesterName,
        section: section || 'A',
        teacherId,
        tas: tas && tas.length > 0 ? { connect: tas.map(id => ({ id })) } : undefined,
        maxCapacity: maxCapacity || 60,
        schedule: schedule || [],
        enrollmentStatus: enrollmentStatus || 'open',
        status: status || 'scheduled',
        startDate,
        endDate
      },
      include: {
        course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } },
        program: { select: { id: true, programCode: true, name: true } },
        teacher: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        },
        tas: {
          select: {
            id: true,
            studentId: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Course offering created successfully',
      data: offering
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'One or more required references not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Update course offering
 * @route   PUT /api/course-offerings/:id
 * @access  Private/Admin
 */
export const updateCourseOffering = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      courseId,
      programId,
      academicYear,
      semesterNumber,
      semesterName,
      section,
      teacherId,
      tas,
      maxCapacity,
      schedule,
      enrollmentStatus,
      status,
      startDate,
      endDate,
      isActive
    } = req.body;

    const offering = await prisma.courseOffering.findUnique({ where: { id } });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Validate references if being changed
    const updates = {};
    if (courseId && courseId !== offering.courseId) {
      const courseDoc = await prisma.course.findUnique({ where: { id: courseId } });
      if (!courseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      updates.courseId = courseId;
    }

    if (programId && programId !== offering.programId) {
      const programDoc = await prisma.program.findUnique({ where: { id: programId } });
      if (!programDoc) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }
      updates.programId = programId;
    }

    if (teacherId && teacherId !== offering.teacherId) {
      const teacherDoc = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacherDoc) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      updates.teacherId = teacherId;
    }

    // Validate TAs if being changed
    if (tas) {
      const taCount = await prisma.ta.count({
        where: { id: { in: tas } }
      });
      if (taCount !== tas.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found'
        });
      }
      updates.tas = { set: tas.map(id => ({ id })) };
    }

    // Check for duplicate if key fields change
    if (courseId || programId || academicYear || semesterNumber || section) {
      const checkCourse = courseId || offering.courseId;
      const checkProgram = programId || offering.programId;
      const checkYear = academicYear || offering.academicYear;
      const checkSem = semesterNumber || offering.semesterNumber;
      const checkSection = section || offering.section;

      const existingOffering = await prisma.courseOffering.findFirst({
        where: {
          courseId: checkCourse,
          programId: checkProgram,
          academicYear: checkYear,
          semesterNumber: checkSem,
          section: checkSection,
          id: { not: id }
        }
      });

      if (existingOffering) {
        return res.status(400).json({
          success: false,
          message: 'Another course offering already exists for this combination'
        });
      }
    }

    // Update fields
    if (academicYear) updates.academicYear = academicYear;
    if (semesterNumber) updates.semesterNumber = semesterNumber;
    if (semesterName !== undefined) updates.semesterName = semesterName;
    if (section) updates.section = section;
    if (maxCapacity !== undefined) updates.maxCapacity = maxCapacity;
    if (schedule !== undefined) updates.schedule = schedule;
    if (enrollmentStatus) updates.enrollmentStatus = enrollmentStatus;
    if (status) updates.status = status;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedOffering = await prisma.courseOffering.update({
      where: { id },
      data: updates,
      include: {
        course: { select: { id: true, courseCode: true, courseName: true, creditHours: true, courseType: true } },
        program: { select: { id: true, programCode: true, name: true } },
        teacher: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        },
        tas: {
          select: {
            id: true,
            studentId: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Course offering updated successfully',
      data: updatedOffering
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course offering or reference not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Assign instructor to course offering
 * @route   PUT /api/course-offerings/:id/instructor
 * @access  Private/Admin
 */
export const assignInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;

    const offering = await prisma.courseOffering.findUnique({ where: { id } });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    const teacherDoc = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const updatedOffering = await prisma.courseOffering.update({
      where: { id },
      data: { teacherId },
      include: {
        teacher: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Instructor assigned successfully',
      data: {
        offeringId: updatedOffering.id,
        teacher: updatedOffering.teacher
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning instructor',
      error: error.message
    });
  }
};

/**
 * @desc    Assign TAs to course offering
 * @route   PUT /api/course-offerings/:id/tas
 * @access  Private/Admin
 */
export const assignTAs = async (req, res) => {
  try {
    const { id } = req.params;
    const { taIds } = req.body;

    const offering = await prisma.courseOffering.findUnique({ where: { id } });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (taIds && taIds.length > 0) {
      const taCount = await prisma.ta.count({
        where: { id: { in: taIds } }
      });
      if (taCount !== taIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found'
        });
      }
    }

    const updatedOffering = await prisma.courseOffering.update({
      where: { id },
      data: {
        tas: { set: (taIds || []).map(id => ({ id })) }
      },
      include: {
        tas: {
          select: {
            id: true,
            studentId: true,
            userId: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'TAs assigned successfully',
      data: {
        offeringId: updatedOffering.id,
        tas: updatedOffering.tas
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning TAs',
      error: error.message
    });
  }
};

/**
 * @desc    Update schedule for course offering
 * @route   PUT /api/course-offerings/:id/schedule
 * @access  Private/Admin
 */
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule } = req.body;

    const offering = await prisma.courseOffering.findUnique({ where: { id } });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Validate schedule format
    if (schedule && Array.isArray(schedule)) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const validTypes = ['lecture', 'lab', 'tutorial'];
      
      for (const slot of schedule) {
        if (slot.day && !validDays.includes(slot.day)) {
          return res.status(400).json({
            success: false,
            message: `Invalid day: ${slot.day}`
          });
        }
        if (slot.type && !validTypes.includes(slot.type)) {
          return res.status(400).json({
            success: false,
            message: `Invalid schedule type: ${slot.type}`
          });
        }
      }
    }

    const updatedOffering = await prisma.courseOffering.update({
      where: { id },
      data: { schedule: schedule || [] }
    });

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: {
        offeringId: updatedOffering.id,
        schedule: updatedOffering.schedule
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating schedule',
      error: error.message
    });
  }
};

/**
 * @desc    Update capacity for course offering
 * @route   PUT /api/course-offerings/:id/capacity
 * @access  Private/Admin
 */
export const updateCapacity = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxCapacity } = req.body;

    const offering = await prisma.courseOffering.findUnique({ where: { id } });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (maxCapacity < offering.currentEnrollment) {
      return res.status(400).json({
        success: false,
        message: `Cannot set capacity below current enrollment (${offering.currentEnrollment})`
      });
    }

    // Auto-update enrollment status based on capacity
    let newStatus = offering.enrollmentStatus;
    if (offering.currentEnrollment >= maxCapacity) {
      newStatus = 'closed';
    } else if (newStatus === 'closed' && offering.currentEnrollment < maxCapacity) {
      newStatus = 'open';
    }

    const updatedOffering = await prisma.courseOffering.update({
      where: { id },
      data: {
        maxCapacity,
        enrollmentStatus: newStatus
      }
    });

    res.status(200).json({
      success: true,
      message: 'Capacity updated successfully',
      data: {
        offeringId: updatedOffering.id,
        maxCapacity: updatedOffering.maxCapacity,
        currentEnrollment: updatedOffering.currentEnrollment,
        enrollmentStatus: updatedOffering.enrollmentStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating capacity',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk create course offerings for a semester
 * @route   POST /api/course-offerings/bulk
 * @access  Private/Admin
 */
export const bulkCreateOfferings = async (req, res) => {
  try {
    const { offerings } = req.body;

    if (!offerings || !Array.isArray(offerings) || offerings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of offerings'
      });
    }

    const results = {
      created: [],
      errors: []
    };

    for (const offeringData of offerings) {
      try {
        // Validate required fields
        if (!offeringData.courseId || !offeringData.programId || !offeringData.academicYear || 
            !offeringData.semesterNumber || !offeringData.teacherId) {
          results.errors.push({
            data: offeringData,
            error: 'Missing required fields'
          });
          continue;
        }

        // Check for existing offering
        const existing = await prisma.courseOffering.findFirst({
          where: {
            courseId: offeringData.courseId,
            programId: offeringData.programId,
            academicYear: offeringData.academicYear,
            semesterNumber: offeringData.semesterNumber,
            section: offeringData.section || 'A'
          }
        });

        if (existing) {
          results.errors.push({
            data: offeringData,
            error: 'Offering already exists'
          });
          continue;
        }

        const offering = await prisma.courseOffering.create({
          data: {
            courseId: offeringData.courseId,
            programId: offeringData.programId,
            academicYear: offeringData.academicYear,
            semesterNumber: offeringData.semesterNumber,
            semesterName: offeringData.semesterName,
            section: offeringData.section || 'A',
            teacherId: offeringData.teacherId,
            maxCapacity: offeringData.maxCapacity || 60,
            enrollmentStatus: offeringData.enrollmentStatus || 'open',
            status: offeringData.status || 'scheduled'
          }
        });

        results.created.push(offering.id);
      } catch (err) {
        results.errors.push({
          data: offeringData,
          error: err.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${results.created.length} offerings, ${results.errors.length} errors`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error bulk creating offerings',
      error: error.message
    });
  }
};

/**
 * @desc    Delete course offering (soft delete)
 * @route   DELETE /api/course-offerings/:id
 * @access  Private/Admin
 */
export const deleteCourseOffering = async (req, res) => {
  try {
    const { id } = req.params;

    const offering = await prisma.courseOffering.findUnique({ where: { id } });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (offering.currentEnrollment > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete offering with ${offering.currentEnrollment} enrolled students`
      });
    }

    // Soft delete
    const deletedOffering = await prisma.courseOffering.update({
      where: { id },
      data: { isActive: false }
    });

    res.status(200).json({
      success: true,
      message: 'Course offering deleted successfully',
      data: deletedOffering
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Restore soft-deleted course offering
 * @route   POST /api/course-offerings/:id/restore
 * @access  Private/Admin
 */
export const restoreCourseOffering = async (req, res) => {
  try {
    const { id } = req.params;

    const offering = await prisma.courseOffering.findUnique({ where: { id } });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (offering.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Course offering is not deleted'
      });
    }

    const restoredOffering = await prisma.courseOffering.update({
      where: { id },
      data: { isActive: true }
    });

    res.status(200).json({
      success: true,
      message: 'Course offering restored successfully',
      data: restoredOffering
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error restoring course offering',
      error: error.message
    });
  }
};

/**
 * @desc    Get course offerings by teacher
 * @route   GET /api/course-offerings/teacher/:teacherId
 * @access  Private
 */
export const getOfferingsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { semester, program } = req.query;

    const where = {
      instructorId: teacherId,
      isActive: true
    };

    if (semester) where.semester = semester;
    if (program) where.programId = program;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: true,
        program: true,
        instructor: true,
        teachingAssistants: true
      },
      orderBy: { courseCode: 'asc' }
    });

    res.status(200).json({
      success: true,
      count: offerings.length,
      data: offerings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching offerings by teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Get course offerings by course
 * @route   GET /api/course-offerings/course/:courseId
 * @access  Private
 */
export const getOfferingsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { semester, program } = req.query;

    const where = {
      courseId,
      isActive: true
    };

    if (semester) where.semester = semester;
    if (program) where.programId = program;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: true,
        program: true,
        instructor: true,
        teachingAssistants: true
      },
      orderBy: { semester: 'asc' }
    });

    res.status(200).json({
      success: true,
      count: offerings.length,
      data: offerings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching offerings by course',
      error: error.message
    });
  }
};

export default {
  getAllCourseOfferings,
  getOfferingsByProgramSemester,
  getCourseOfferingById,
  createCourseOffering,
  updateCourseOffering,
  assignInstructor,
  assignTAs,
  updateSchedule,
  updateCapacity,
  bulkCreateOfferings,
  deleteCourseOffering,
  restoreCourseOffering,
  getOfferingsByTeacher,
  getOfferingsByCourse
};
