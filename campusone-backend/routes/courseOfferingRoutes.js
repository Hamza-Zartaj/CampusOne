import express from 'express';
import {
  createCourseOffering,
  getCourseOfferings,
  getCourseOffering,
  updateCourseOffering,
  assignTAs,
  getTeacherCourses,
  deleteCourseOffering
} from '../controllers/courseOfferingController.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin, requireTeacher, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (any authenticated user)
router.get('/', getCourseOfferings);
router.get('/:id', getCourseOffering);

// Teacher can view their assigned courses
router.get('/teacher/:teacherId', requireTeacher, getTeacherCourses);

// Admin routes
router.post('/', checkPermission('courseOffering', 'create'), createCourseOffering);
router.put('/:id', checkPermission('courseOffering', 'update'), updateCourseOffering);
router.put('/:id/assign-tas', requireAdmin, assignTAs);
router.delete('/:id', checkPermission('courseOffering', 'delete'), deleteCourseOffering);

export default router;
