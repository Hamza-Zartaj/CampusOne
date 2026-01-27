import express from 'express';
import {
  createProgram,
  getPrograms,
  getProgram,
  updateProgram,
  deleteProgram,
  getProgramCurriculum
} from '../controllers/programController.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (any authenticated user)
router.get('/', getPrograms);
router.get('/:id', getProgram);
router.get('/:id/curriculum', getProgramCurriculum);

// Admin routes
router.post('/', checkPermission('program', 'create'), createProgram);
router.put('/:id', checkPermission('program', 'update'), updateProgram);

// SuperAdmin only
router.delete('/:id', requireSuperAdmin, deleteProgram);

export default router;
