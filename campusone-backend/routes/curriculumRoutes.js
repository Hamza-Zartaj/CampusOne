import express from 'express';
import {
  addToCurriculum,
  getCurriculum,
  updateCurriculum,
  removeFromCurriculum,
  bulkAddToCurriculum
} from '../controllers/curriculumController.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (any authenticated user)
router.get('/', getCurriculum);

// Admin routes
router.post('/', checkPermission('curriculum', 'create'), addToCurriculum);
router.post('/bulk', checkPermission('curriculum', 'create'), bulkAddToCurriculum);
router.put('/:id', checkPermission('curriculum', 'update'), updateCurriculum);
router.delete('/:id', checkPermission('curriculum', 'delete'), removeFromCurriculum);

export default router;
