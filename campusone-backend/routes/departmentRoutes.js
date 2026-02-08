import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
  permanentDeleteDepartment
} from '../controllers/departmentController.js';
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

// Get all departments with pagination and search
router.get(
  '/',
  authorizePermission('manage_academic'),
  validatePagination,
  getAllDepartments
);

// Get single department by ID
router.get(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getDepartmentById
);

// Create new department
router.post(
  '/',
  authorizePermission('manage_academic'),
  sanitizeInput,
  createDepartment
);

// Update department
router.put(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateDepartment
);

// Delete department (soft delete)
router.delete(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  deleteDepartment
);

// Restore soft-deleted department
router.post(
  '/:id/restore',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  restoreDepartment
);

// Permanently delete department (Super Admin only)
router.delete(
  '/:id/permanent',
  authorizePermission('super_admin'),
  validateObjectId('id'),
  permanentDeleteDepartment
);

export default router;
