import express from 'express';
import {
  enrollStudent,
  getEnrollments,
  getStudentCurrentCourses,
  getStudentEnrollments,
  updateEnrollment,
  withdrawEnrollment,
  getOfferingEnrollments,
  deleteEnrollment
} from '../controllers/enrollmentController.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin, requireTeacher, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Student routes (own data)
router.get('/student/:studentId', getStudentEnrollments);
router.get('/student/:studentId/current', getStudentCurrentCourses);
router.put('/:id/withdraw', withdrawEnrollment);

// Teacher routes (assigned courses)
router.get('/offering/:offeringId', requireTeacher, getOfferingEnrollments);

// Admin routes
router.get('/', requireAdmin, getEnrollments);
router.post('/', checkPermission('enrollment', 'create'), enrollStudent);
router.put('/:id', checkPermission('enrollment', 'update'), updateEnrollment);
router.delete('/:id', checkPermission('enrollment', 'delete'), deleteEnrollment);

export default router;
