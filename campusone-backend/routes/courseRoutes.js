import express from 'express';
import {
  getAllCourses,
  getCourseById,
  getCourseByCode,
  getPrereqTree,
  getCoursesByDepartment,
  getCoursesByProgram,
  createCourse,
  updateCourse,
  deleteCourse,
  restoreCourse,
  permanentDeleteCourse,
  getDomains
} from '../controllers/courseController.js';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import {
  validatePagination,
  validateObjectId,
  sanitizeInput
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Apply admin authorization to all routes
router.use(authorize('admin'));

// Get all unique domains
router.get(
  '/domains',
  authorizePermission('manage_academic'),
  getDomains
);

// Get all courses with pagination and search
router.get(
  '/',
  authorizePermission('manage_academic'),
  validatePagination,
  getAllCourses
);

// Get course by code
router.get(
  '/code/:code',
  authorizePermission('manage_academic'),
  getCourseByCode
);

// Get courses by department
router.get(
  '/department/:departmentId',
  authorizePermission('manage_academic'),
  validateObjectId('departmentId'),
  getCoursesByDepartment
);

// Get courses by program
router.get(
  '/program/:programId',
  authorizePermission('manage_academic'),
  validateObjectId('programId'),
  getCoursesByProgram
);

// Get prerequisite tree for a course
router.get(
  '/:id/prereq-tree',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getPrereqTree
);

// Get single course by ID
router.get(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getCourseById
);

// Create new course
router.post(
  '/',
  authorizePermission('manage_academic'),
  sanitizeInput,
  createCourse
);

// Update course
router.put(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateCourse
);

// Delete course (soft delete)
router.delete(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  deleteCourse
);

// Restore soft-deleted course
router.post(
  '/:id/restore',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  restoreCourse
);

// Permanently delete course (Super Admin only)
router.delete(
  '/:id/permanent',
  authorizePermission('super_admin'),
  validateObjectId('id'),
  permanentDeleteCourse
);

export default router;
