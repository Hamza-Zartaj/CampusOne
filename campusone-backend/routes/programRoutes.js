import express from 'express';
import {
  getAllPrograms,
  getProgramById,
  getProgramsByDepartment,
  createProgram,
  updateProgram,
  deleteProgram,
  restoreProgram,
  permanentDeleteProgram,
  getProgramCurriculum,
  getCurriculumBySemester,
  updateProgramCurriculum,
  updateSemesterCurriculum,
  addCourseToSemester,
  removeCourseFromSemester,
  addElectiveSlot,
  removeElectiveSlot
} from '../controllers/programController.js';
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

// Get all programs with pagination and search
router.get(
  '/',
  authorizePermission('manage_academic'),
  validatePagination,
  getAllPrograms
);

// Get programs by department
router.get(
  '/department/:departmentId',
  authorizePermission('manage_academic'),
  validateObjectId('departmentId'),
  getProgramsByDepartment
);

// Get single program by ID
router.get(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getProgramById
);

// Create new program
router.post(
  '/',
  authorizePermission('manage_academic'),
  sanitizeInput,
  createProgram
);

// Update program
router.put(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateProgram
);

// Delete program (soft delete)
router.delete(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  deleteProgram
);

// Restore soft-deleted program
router.post(
  '/:id/restore',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  restoreProgram
);

// Permanently delete program (Super Admin only)
router.delete(
  '/:id/permanent',
  authorizePermission('super_admin'),
  validateObjectId('id'),
  permanentDeleteProgram
);

// ==================== CURRICULUM ROUTES ====================

// Get full curriculum for a program
router.get(
  '/:id/curriculum',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getProgramCurriculum
);

// Get curriculum for a specific semester
router.get(
  '/:id/curriculum/semester/:semesterNumber',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getCurriculumBySemester
);

// Update entire curriculum for a program
router.put(
  '/:id/curriculum',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateProgramCurriculum
);

// Update curriculum for a specific semester
router.put(
  '/:id/curriculum/semester/:semesterNumber',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateSemesterCurriculum
);

// Add a course to a semester's required courses
router.post(
  '/:id/curriculum/semester/:semesterNumber/course',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  addCourseToSemester
);

// Remove a course from a semester's required courses
router.delete(
  '/:id/curriculum/semester/:semesterNumber/course/:courseId',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  validateObjectId('courseId'),
  removeCourseFromSemester
);

// Add an elective slot to a semester
router.post(
  '/:id/curriculum/semester/:semesterNumber/elective',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  addElectiveSlot
);

// Remove an elective slot from a semester
router.delete(
  '/:id/curriculum/semester/:semesterNumber/elective/:slotIndex',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  removeElectiveSlot
);

export default router;
