import CourseCatalog from '../models/CourseCatalog.js';
import Curriculum from '../models/Curriculum.js';
import CourseOffering from '../models/CourseOffering.js';

/**
 * @desc    Create a new course in catalog
 * @route   POST /api/courses
 * @access  Admin, SuperAdmin
 */
export const createCourse = async (req, res) => {
  try {
    const { courseCode, courseName, description, creditHours, theoryHours, labHours, prerequisites, objectives, department } = req.body;

    // Check if course code already exists
    const existingCourse = await CourseCatalog.findOne({ courseCode: courseCode.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }

    // Validate prerequisites exist
    if (prerequisites && prerequisites.length > 0) {
      const validPrereqs = await CourseCatalog.countDocuments({ _id: { $in: prerequisites } });
      if (validPrereqs !== prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisites are invalid'
        });
      }
    }

    const course = await CourseCatalog.create({
      courseCode,
      courseName,
      description,
      creditHours,
      theoryHours,
      labHours,
      prerequisites,
      objectives,
      department
    });

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
 * @desc    Get all courses from catalog
 * @route   GET /api/courses
 * @access  All authenticated users
 */
export const getCourses = async (req, res) => {
  try {
    const { department, search, isActive } = req.query;
    
    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { courseCode: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await CourseCatalog.find(filter)
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
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  All authenticated users
 */
export const getCourse = async (req, res) => {
  try {
    const course = await CourseCatalog.findById(req.params.id)
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
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Admin, SuperAdmin
 */
export const updateCourse = async (req, res) => {
  try {
    const { courseName, description, creditHours, theoryHours, labHours, prerequisites, objectives, department, isActive } = req.body;

    const course = await CourseCatalog.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Validate prerequisites
    if (prerequisites && prerequisites.length > 0) {
      // Prevent self-reference
      if (prerequisites.includes(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'A course cannot be its own prerequisite'
        });
      }

      const validPrereqs = await CourseCatalog.countDocuments({ _id: { $in: prerequisites } });
      if (validPrereqs !== prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisites are invalid'
        });
      }
    }

    const updatedCourse = await CourseCatalog.findByIdAndUpdate(
      req.params.id,
      { courseName, description, creditHours, theoryHours, labHours, prerequisites, objectives, department, isActive },
      { new: true, runValidators: true }
    ).populate('prerequisites', 'courseCode courseName');

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
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
 * @desc    Delete course
 * @route   DELETE /api/courses/:id
 * @access  SuperAdmin
 */
export const deleteCourse = async (req, res) => {
  try {
    const course = await CourseCatalog.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is used in any curriculum
    const curriculumCount = await Curriculum.countDocuments({ courseId: req.params.id });
    if (curriculumCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course that is part of a curriculum. Remove from curriculum first.'
      });
    }

    // Check if course has offerings
    const offeringCount = await CourseOffering.countDocuments({ courseId: req.params.id });
    if (offeringCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with existing offerings. Remove offerings first.'
      });
    }

    await CourseCatalog.findByIdAndDelete(req.params.id);

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
