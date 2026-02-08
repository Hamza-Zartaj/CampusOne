import CourseOffering from '../models/CourseOffering.js';
import Course from '../models/Course.js';
import Program from '../models/Program.js';
import Teacher from '../models/Teacher.js';
import TA from '../models/TA.js';

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
      isActive,
      includeSoftDeleted 
    } = req.query;

    // Build query
    const query = {};

    // Filter by course
    if (course) {
      query.course = course;
    }

    // Filter by program
    if (program) {
      query.program = program;
    }

    // Filter by academic year
    if (academicYear) {
      query.academicYear = academicYear;
    }

    // Filter by semester number
    if (semesterNumber) {
      query.semesterNumber = parseInt(semesterNumber);
    }

    // Filter by teacher
    if (teacher) {
      query.teacher = teacher;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by enrollment status
    if (enrollmentStatus) {
      query.enrollmentStatus = enrollmentStatus;
    }

    // Filter by active status
    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query options
    const queryOptions = includeSoftDeleted === 'true' ? { includeSoftDeleted: true } : {};

    // Get total count
    const total = await CourseOffering.countDocuments(query).setOptions(queryOptions);

    // Get course offerings
    const offerings = await CourseOffering.find(query)
      .setOptions(queryOptions)
      .populate('course', 'courseCode courseName creditHours courseType')
      .populate('program', 'programCode name')
      .populate({
        path: 'teacher',
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate({
        path: 'tas',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ academicYear: -1, semesterNumber: 1, 'course.courseCode': 1 })
      .skip(skip)
      .limit(limitNum);

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

    const query = { program: programId };

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (semesterNumber) {
      query.semesterNumber = parseInt(semesterNumber);
    }

    if (status) {
      query.status = status;
    }

    if (enrollmentStatus) {
      query.enrollmentStatus = enrollmentStatus;
    }

    const offerings = await CourseOffering.find(query)
      .populate('course', 'courseCode courseName creditHours courseType domain')
      .populate('program', 'programCode name')
      .populate({
        path: 'teacher',
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate({
        path: 'tas',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ 'course.courseCode': 1 });

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

    const offering = await CourseOffering.findById(id)
      .populate('course', 'courseCode courseName creditHours courseType domain description prerequisites')
      .populate('program', 'programCode name department')
      .populate({
        path: 'teacher',
        select: 'employeeId designation officeRoom officeHours userId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate({
        path: 'tas',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'name email' }
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
      course,
      program,
      academicYear,
      semesterNumber,
      semesterName,
      section,
      teacher,
      tas,
      maxCapacity,
      schedule,
      enrollmentStatus,
      status,
      startDate,
      endDate
    } = req.body;

    // Validate course exists
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Validate program exists
    const programDoc = await Program.findById(program);
    if (!programDoc) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Validate teacher exists
    const teacherDoc = await Teacher.findById(teacher);
    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Validate TAs if provided
    if (tas && tas.length > 0) {
      const taCount = await TA.countDocuments({ _id: { $in: tas } });
      if (taCount !== tas.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found'
        });
      }
    }

    // Check for duplicate offering
    const existingOffering = await CourseOffering.findOne({
      course,
      program,
      academicYear,
      semesterNumber,
      section: section || 'A'
    }).setOptions({ includeSoftDeleted: true });

    if (existingOffering) {
      return res.status(400).json({
        success: false,
        message: 'Course offering already exists for this course, program, academic year, semester, and section'
      });
    }

    const offering = await CourseOffering.create({
      course,
      program,
      academicYear,
      semesterNumber,
      semesterName,
      section: section || 'A',
      teacher,
      tas: tas || [],
      maxCapacity: maxCapacity || 60,
      schedule: schedule || [],
      enrollmentStatus: enrollmentStatus || 'open',
      status: status || 'scheduled',
      startDate,
      endDate
    });

    // Populate and return
    await offering.populate([
      { path: 'course', select: 'courseCode courseName creditHours courseType' },
      { path: 'program', select: 'programCode name' },
      { 
        path: 'teacher', 
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      },
      { 
        path: 'tas', 
        select: 'studentId userId',
        populate: { path: 'userId', select: 'name email' }
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Course offering created successfully',
      data: offering
    });
  } catch (error) {
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
      course,
      program,
      academicYear,
      semesterNumber,
      semesterName,
      section,
      teacher,
      tas,
      maxCapacity,
      schedule,
      enrollmentStatus,
      status,
      startDate,
      endDate,
      isActive
    } = req.body;

    const offering = await CourseOffering.findById(id);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Validate course if being changed
    if (course && course !== offering.course.toString()) {
      const courseDoc = await Course.findById(course);
      if (!courseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    // Validate program if being changed
    if (program && program !== offering.program.toString()) {
      const programDoc = await Program.findById(program);
      if (!programDoc) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }
    }

    // Validate teacher if being changed
    if (teacher && teacher !== offering.teacher.toString()) {
      const teacherDoc = await Teacher.findById(teacher);
      if (!teacherDoc) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
    }

    // Validate TAs if being changed
    if (tas) {
      const taCount = await TA.countDocuments({ _id: { $in: tas } });
      if (taCount !== tas.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found'
        });
      }
    }

    // Check for duplicate if key fields are being changed
    if (course || program || academicYear || semesterNumber || section) {
      const checkCourse = course || offering.course;
      const checkProgram = program || offering.program;
      const checkYear = academicYear || offering.academicYear;
      const checkSem = semesterNumber || offering.semesterNumber;
      const checkSection = section || offering.section;

      const existingOffering = await CourseOffering.findOne({
        course: checkCourse,
        program: checkProgram,
        academicYear: checkYear,
        semesterNumber: checkSem,
        section: checkSection,
        _id: { $ne: id }
      }).setOptions({ includeSoftDeleted: true });

      if (existingOffering) {
        return res.status(400).json({
          success: false,
          message: 'Another course offering already exists for this combination'
        });
      }
    }

    // Update fields
    if (course) offering.course = course;
    if (program) offering.program = program;
    if (academicYear) offering.academicYear = academicYear;
    if (semesterNumber) offering.semesterNumber = semesterNumber;
    if (semesterName !== undefined) offering.semesterName = semesterName;
    if (section) offering.section = section;
    if (teacher) offering.teacher = teacher;
    if (tas !== undefined) offering.tas = tas;
    if (maxCapacity !== undefined) offering.maxCapacity = maxCapacity;
    if (schedule !== undefined) offering.schedule = schedule;
    if (enrollmentStatus) offering.enrollmentStatus = enrollmentStatus;
    if (status) offering.status = status;
    if (startDate !== undefined) offering.startDate = startDate;
    if (endDate !== undefined) offering.endDate = endDate;
    if (isActive !== undefined) offering.isActive = isActive;

    await offering.save();

    // Populate and return
    await offering.populate([
      { path: 'course', select: 'courseCode courseName creditHours courseType' },
      { path: 'program', select: 'programCode name' },
      { 
        path: 'teacher', 
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      },
      { 
        path: 'tas', 
        select: 'studentId userId',
        populate: { path: 'userId', select: 'name email' }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Course offering updated successfully',
      data: offering
    });
  } catch (error) {
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

    const offering = await CourseOffering.findById(id);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    const teacherDoc = await Teacher.findById(teacherId);
    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    offering.teacher = teacherId;
    await offering.save();

    await offering.populate({
      path: 'teacher',
      select: 'employeeId designation userId',
      populate: { path: 'userId', select: 'name email' }
    });

    res.status(200).json({
      success: true,
      message: 'Instructor assigned successfully',
      data: {
        offeringId: offering._id,
        teacher: offering.teacher
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

    const offering = await CourseOffering.findById(id);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (taIds && taIds.length > 0) {
      const taCount = await TA.countDocuments({ _id: { $in: taIds } });
      if (taCount !== taIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more TAs not found'
        });
      }
    }

    offering.tas = taIds || [];
    await offering.save();

    await offering.populate({
      path: 'tas',
      select: 'studentId userId',
      populate: { path: 'userId', select: 'name email' }
    });

    res.status(200).json({
      success: true,
      message: 'TAs assigned successfully',
      data: {
        offeringId: offering._id,
        tas: offering.tas
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

    const offering = await CourseOffering.findById(id);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    // Validate schedule format
    if (schedule && Array.isArray(schedule)) {
      for (const slot of schedule) {
        if (slot.day && !['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(slot.day)) {
          return res.status(400).json({
            success: false,
            message: `Invalid day: ${slot.day}`
          });
        }
        if (slot.type && !['lecture', 'lab', 'tutorial'].includes(slot.type)) {
          return res.status(400).json({
            success: false,
            message: `Invalid schedule type: ${slot.type}`
          });
        }
      }
    }

    offering.schedule = schedule || [];
    await offering.save();

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: {
        offeringId: offering._id,
        schedule: offering.schedule
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

    const offering = await CourseOffering.findById(id);

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

    offering.maxCapacity = maxCapacity;
    
    // Auto-update enrollment status based on capacity
    if (offering.currentEnrollment >= maxCapacity) {
      offering.enrollmentStatus = 'closed';
    } else if (offering.enrollmentStatus === 'closed' && offering.currentEnrollment < maxCapacity) {
      offering.enrollmentStatus = 'open';
    }

    await offering.save();

    res.status(200).json({
      success: true,
      message: 'Capacity updated successfully',
      data: {
        offeringId: offering._id,
        maxCapacity: offering.maxCapacity,
        currentEnrollment: offering.currentEnrollment,
        enrollmentStatus: offering.enrollmentStatus
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
        if (!offeringData.course || !offeringData.program || !offeringData.academicYear || 
            !offeringData.semesterNumber || !offeringData.teacher) {
          results.errors.push({
            data: offeringData,
            error: 'Missing required fields (course, program, academicYear, semesterNumber, teacher)'
          });
          continue;
        }

        // Check for existing offering
        const existing = await CourseOffering.findOne({
          course: offeringData.course,
          program: offeringData.program,
          academicYear: offeringData.academicYear,
          semesterNumber: offeringData.semesterNumber,
          section: offeringData.section || 'A'
        }).setOptions({ includeSoftDeleted: true });

        if (existing) {
          results.errors.push({
            data: offeringData,
            error: 'Offering already exists'
          });
          continue;
        }

        const offering = await CourseOffering.create({
          ...offeringData,
          section: offeringData.section || 'A',
          maxCapacity: offeringData.maxCapacity || 60,
          enrollmentStatus: offeringData.enrollmentStatus || 'open',
          status: offeringData.status || 'scheduled'
        });

        results.created.push(offering._id);
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

    const offering = await CourseOffering.findById(id);

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

    await offering.softDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Course offering deleted successfully'
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

    const offering = await CourseOffering.findById(id).setOptions({ includeSoftDeleted: true });

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found'
      });
    }

    if (!offering.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Course offering is not deleted'
      });
    }

    await offering.restore();

    res.status(200).json({
      success: true,
      message: 'Course offering restored successfully',
      data: offering
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
 * @desc    Get offerings taught by a specific teacher
 * @route   GET /api/course-offerings/teacher/:teacherId
 * @access  Private
 */
export const getOfferingsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { academicYear, semesterNumber, status } = req.query;

    const query = { teacher: teacherId };

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (semesterNumber) {
      query.semesterNumber = parseInt(semesterNumber);
    }

    if (status) {
      query.status = status;
    }

    const offerings = await CourseOffering.find(query)
      .populate('course', 'courseCode courseName creditHours courseType')
      .populate('program', 'programCode name')
      .populate({
        path: 'tas',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'name email' }
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
      message: 'Error fetching teacher offerings',
      error: error.message
    });
  }
};

/**
 * @desc    Get offerings available for a course
 * @route   GET /api/course-offerings/course/:courseId
 * @access  Private
 */
export const getOfferingsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { academicYear, semesterNumber, enrollmentStatus } = req.query;

    const query = { course: courseId };

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (semesterNumber) {
      query.semesterNumber = parseInt(semesterNumber);
    }

    if (enrollmentStatus) {
      query.enrollmentStatus = enrollmentStatus;
    }

    const offerings = await CourseOffering.find(query)
      .populate('program', 'programCode name')
      .populate({
        path: 'teacher',
        select: 'employeeId designation userId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ academicYear: -1, semesterNumber: 1, section: 1 });

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
