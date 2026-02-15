import Teacher from '../models/Teacher.js';

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
    const teachers = await Teacher.find()
      .populate('userId', 'name email username isActive')
      .select('_id userId employeeId designation')
      .skip(skip)
      .limit(limitNum)
      .lean()
      .sort({ employeeId: 1 });

    // Restructure response to include user info
    const teachersWithUserInfo = teachers
      .filter(t => t.userId) // Only include teachers with valid users
      .map(t => ({
        _id: t._id,
        teacherId: t._id,
        userId: t.userId._id,
        name: t.userId.name,
        email: t.userId.email,
        username: t.userId.username,
        employeeId: t.employeeId,
        designation: t.designation || 'Lecturer',
        isActive: t.userId.isActive
      }));

    // Get total count
    const total = await Teacher.countDocuments();

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

    const teacher = await Teacher.findById(id)
      .populate('userId', 'name email username isActive')
      .lean();

    if (!teacher || !teacher.userId) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: teacher._id,
        teacherId: teacher._id,
        userId: teacher.userId._id,
        name: teacher.userId.name,
        email: teacher.userId.email,
        username: teacher.userId.username,
        employeeId: teacher.employeeId,
        designation: teacher.designation || 'Lecturer',
        isActive: teacher.userId.isActive
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

    const teacher = await Teacher.findOne({ userId })
      .populate('userId', 'name email username isActive')
      .lean();

    if (!teacher || !teacher.userId) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: teacher._id,
        teacherId: teacher._id,
        userId: teacher.userId._id,
        name: teacher.userId.name,
        email: teacher.userId.email,
        username: teacher.userId.username,
        employeeId: teacher.employeeId,
        designation: teacher.designation || 'Lecturer',
        isActive: teacher.userId.isActive
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

export default {
  getAllTeachers,
  getTeacherById,
  getTeacherByUserId
};
