import express from 'express';
import {
  createAcademicTerm,
  getAcademicTerms,
  getCurrentTerm,
  getAcademicTerm,
  updateAcademicTerm,
  setCurrentTerm,
  deleteAcademicTerm
} from '../controllers/academicTermController.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (any authenticated user)
router.get('/', getAcademicTerms);
router.get('/current', getCurrentTerm);
router.get('/:id', getAcademicTerm);

// Admin routes
router.post('/', checkPermission('academicTerm', 'create'), createAcademicTerm);
router.put('/:id', checkPermission('academicTerm', 'update'), updateAcademicTerm);
router.put('/:id/set-current', requireAdmin, setCurrentTerm);

// SuperAdmin only
router.delete('/:id', requireSuperAdmin, deleteAcademicTerm);

export default router;
