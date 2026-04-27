import express from 'express';
import {
  getAllCourseOfferings,
  getCourseOfferingById,
  getOfferingsByProgramSemester,
  createCourseOffering,
  updateCourseOffering,
  assignInstructor,
  updateSchedule,
  updateCapacity,
  bulkCreateOfferings,
  deleteCourseOffering,
  restoreCourseOffering,
  getOfferingsByTeacher,
  getOfferingsByCourse
} from '../controllers/courseOfferingController.js';
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

// Get all course offerings with pagination and filters
router.get(
  '/',
  authorizePermission('manage_academic'),
  validatePagination,
  getAllCourseOfferings
);

// Bulk create course offerings
router.post(
  '/bulk',
  authorizePermission('manage_academic'),
  sanitizeInput,
  bulkCreateOfferings
);

// Get offerings by program and semester
router.get(
  '/program/:programId/semester',
  authorizePermission('manage_academic'),
  validateObjectId('programId'),
  getOfferingsByProgramSemester
);

// Get offerings by teacher
router.get(
  '/teacher/:teacherId',
  authorizePermission('manage_academic'),
  validateObjectId('teacherId'),
  getOfferingsByTeacher
);

// Get offerings by course
router.get(
  '/course/:courseId',
  authorizePermission('manage_academic'),
  validateObjectId('courseId'),
  getOfferingsByCourse
);

// Get single course offering by ID
router.get(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getCourseOfferingById
);

// Create new course offering
router.post(
  '/',
  authorizePermission('manage_academic'),
  sanitizeInput,
  createCourseOffering
);

// Update course offering
router.put(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateCourseOffering
);

// Assign instructor to course offering
router.put(
  '/:id/instructor',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  assignInstructor
);

// Update schedule for course offering
router.put(
  '/:id/schedule',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateSchedule
);

// Update capacity for course offering
router.put(
  '/:id/capacity',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  updateCapacity
);

// Delete course offering (soft delete)
router.delete(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  deleteCourseOffering
);

// Restore soft-deleted course offering
router.post(
  '/:id/restore',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  restoreCourseOffering
);

export default router;
