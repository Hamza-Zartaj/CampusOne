import express from 'express';
import {
  getAllSemesterIncharges,
  getSemesterInchargeById,
  lookupIncharge,
  getInchargesByTeacher,
  assignSemesterIncharge,
  replaceSemesterIncharge,
  updateSemesterIncharge,
  relieveSemesterIncharge,
  deleteSemesterIncharge,
  restoreSemesterIncharge,
  bulkAssignIncharges
} from '../controllers/semesterInchargeController.js';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import { checkInchargeStatus } from '../middleware/inchargeAuth.js';
import {
  validatePagination,
  validateObjectId,
  sanitizeInput
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Apply incharge status check to all routes
router.use(checkInchargeStatus);

// Lookup incharge by scope (public for authenticated users)
router.get(
  '/lookup',
  lookupIncharge
);

// Get incharges by teacher (teachers can see their own)
router.get(
  '/teacher/:teacherId',
  validateObjectId('teacherId'),
  getInchargesByTeacher
);

// Admin-only routes below
router.use(authorize('admin'));

// Get all semester incharges with pagination and filters
router.get(
  '/',
  authorizePermission('manage_academic'),
  validatePagination,
  getAllSemesterIncharges
);

// Bulk assign incharges
router.post(
  '/bulk',
  authorizePermission('manage_academic'),
  sanitizeInput,
  bulkAssignIncharges
);

// Replace semester incharge
router.put(
  '/replace',
  authorizePermission('manage_academic'),
  sanitizeInput,
  replaceSemesterIncharge
);

// Get semester incharge by ID
router.get(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  getSemesterInchargeById
);

// Assign semester incharge
router.post(
  '/',
  authorizePermission('manage_academic'),
  sanitizeInput,
  assignSemesterIncharge
);

// Update semester incharge
router.put(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  sanitizeInput,
  updateSemesterIncharge
);

// Relieve semester incharge
router.put(
  '/:id/relieve',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  relieveSemesterIncharge
);

// Delete semester incharge (soft delete)
router.delete(
  '/:id',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  deleteSemesterIncharge
);

// Restore soft-deleted semester incharge
router.post(
  '/:id/restore',
  authorizePermission('manage_academic'),
  validateObjectId('id'),
  restoreSemesterIncharge
);

export default router;
