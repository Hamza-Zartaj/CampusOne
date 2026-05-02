import prisma from '../prisma/client.js';

/**
 * @desc    Get all teachers with user and designation info
 * @route   GET /api/teachers
 * @access  Private
 */
export const getAllTeachers = async (req, res) => {
  try {
    const { limit = 500, page = 1 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get teachers with populated user info
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        userId: true,
        employeeId: true,
        designation: true,
        user: {
          select: { name: true, email: true, username: true, isActive: true }
        }
      },
      skip,
      take: limitNum,
      orderBy: { employeeId: 'asc' }
    });

    // Restructure response to include user info
    const teachersWithUserInfo = teachers
      .filter(t => t.user) // Only include teachers with valid users
      .map(t => ({
        id: t.id,
        teacherId: t.id,
        userId: t.userId,
        name: t.user.name,
        email: t.user.email,
        username: t.user.username,
        employeeId: t.employeeId,
        designation: t.designation || 'Lecturer',
        isActive: t.user.isActive
      }));

    // Get total count
    const total = await prisma.teacher.count();

    res.status(200).json({
      success: true,
      data: teachersWithUserInfo,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message
    });
  }
};

/**
 * @desc    Get single teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Private
 */
export const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true, email: true, username: true, isActive: true }
        }
      }
    });

    if (!teacher || !teacher.user) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: teacher.id,
        teacherId: teacher.id,
        userId: teacher.user.id,
        name: teacher.user.name,
        email: teacher.user.email,
        username: teacher.user.username,
        employeeId: teacher.employeeId,
        designation: teacher.designation || 'Lecturer',
        isActive: teacher.user.isActive
      }
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Get teacher by User ID
 * @route   GET /api/teachers/user/:userId
 * @access  Private
 */
export const getTeacherByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: {
          select: { name: true, email: true, username: true, isActive: true }
        }
      }
    });

    if (!teacher || !teacher.user) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: teacher.id,
        teacherId: teacher.id,
        userId: teacher.user.id,
        name: teacher.user.name,
        email: teacher.user.email,
        username: teacher.user.username,
        employeeId: teacher.employeeId,
        designation: teacher.designation || 'Lecturer',
        isActive: teacher.user.isActive
      }
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Get teacher profile with course assignments
 * @route   GET /api/teachers/:id/profile
 * @access  Private
 */
export const getTeacherProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true, email: true, username: true, isActive: true, profilePicture: true }
        },
        offerings: {
          where: { isActive: true },
          include: {
            course: { select: { id: true, code: true, title: true, creditHours: true } },
            term: { select: { code: true, academicYear: true, isActive: true } },
            _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!teacher || !teacher.user) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: teacher.id,
        teacherId: teacher.id,
        userId: teacher.user.id,
        name: teacher.user.name,
        email: teacher.user.email,
        username: teacher.user.username,
        profilePicture: teacher.user.profilePicture,
        employeeId: teacher.employeeId,
        designation: teacher.designation || 'Lecturer',
        department: teacher.department,
        qualification: teacher.qualification,
        specialization: teacher.specialization,
        officeRoom: teacher.officeRoom,
        officeHours: teacher.officeHours,
        phone: teacher.phone,
        researchInterests: teacher.researchInterests,
        isActive: teacher.user.isActive,
        courseOfferings: teacher.offerings
      }
    });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher profile',
      error: error.message
    });
  }
};

/**
 * @desc    Update teacher profile
 * @route   PUT /api/teachers/:id
 * @access  Private (Self or Admin)
 */
export const updateTeacherProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, phone, officeRoom, officeHours, qualification, specialization, researchInterests } = req.body;

    // Check authorization - only teacher themselves or admin can update
    const teacher = await prisma.teacher.findUnique({
      where: { id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    if (teacher.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this teacher profile'
      });
    }

    // Update teacher record
    const updateData = {};
    if (designation !== undefined) updateData.designation = designation;
    if (phone !== undefined) updateData.phone = phone;
    if (officeRoom !== undefined) updateData.officeRoom = officeRoom;
    if (officeHours !== undefined) updateData.officeHours = officeHours;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (researchInterests !== undefined) updateData.researchInterests = researchInterests;

    const updated = await prisma.teacher.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true, username: true, isActive: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Teacher profile updated successfully',
      data: {
        id: updated.id,
        teacherId: updated.id,
        userId: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        username: updated.user.username,
        employeeId: updated.employeeId,
        designation: updated.designation,
        department: updated.department,
        qualification: updated.qualification,
        specialization: updated.specialization,
        officeRoom: updated.officeRoom,
        officeHours: updated.officeHours,
        phone: updated.phone,
        researchInterests: updated.researchInterests,
        isActive: updated.user.isActive
      }
    });
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating teacher profile',
      error: error.message
    });
  }
};

/**
 * @desc    Get teacher's current courses for this semester
 * @route   GET /api/teachers/:id/current-courses
 * @access  Private
 */
export const getTeacherCurrentCourses = async (req, res) => {
  try {
    const { id } = req.params;
    const { academicYear, semesterNumber } = req.query;

    const where = { teacherId: id };
    if (academicYear) where.academicYear = academicYear;
    if (semesterNumber) where.semesterNumber = parseInt(semesterNumber);

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: {
          select: { id: true, courseCode: true, courseName: true, creditHours: true }
        },
        enrollments: {
          select: { id: true }
        }
      }
    });

    const enrichedOfferings = offerings.map(off => ({
      id: off.id,
      course: off.course,
      academicYear: off.academicYear,
      semesterNumber: off.semesterNumber,
      semesterName: off.semesterName,
      section: off.section,
      maxCapacity: off.maxCapacity,
      currentEnrollment: off.enrollments.length,
      schedule: off.schedule
    }));

    res.status(200).json({
      success: true,
      data: enrichedOfferings
    });
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher courses',
      error: error.message
    });
  }
};

export default {
  getAllTeachers,
  getTeacherById,
  getTeacherByUserId,
  getTeacherProfile,
  updateTeacherProfile,
  getTeacherCurrentCourses
};
