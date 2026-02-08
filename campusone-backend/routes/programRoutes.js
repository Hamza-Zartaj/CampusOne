import express from 'express';
import {
  getAllPrograms,
  getProgramById,
  getProgramsByDepartment,
  createProgram,
  updateProgram,
  deleteProgram,
  restoreProgram,
  permanentDeleteProgram
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

export default router;
