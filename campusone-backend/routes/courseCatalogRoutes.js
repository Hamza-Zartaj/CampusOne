import express from 'express';
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse
} from '../controllers/courseCatalogController.js';
import { protect } from '../middleware/auth.js';
import { requireSuperAdmin, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (any authenticated user)
router.get('/', getCourses);
router.get('/:id', getCourse);

// Admin routes
router.post('/', checkPermission('courseCatalog', 'create'), createCourse);
router.put('/:id', checkPermission('courseCatalog', 'update'), updateCourse);

// SuperAdmin only
router.delete('/:id', requireSuperAdmin, deleteCourse);

export default router;
