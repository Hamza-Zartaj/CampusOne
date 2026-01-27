import express from 'express';
import {
  createGrade,
  getGrades,
  getGradeByEnrollment,
  getStudentGrades,
  getOfferingGrades,
  finalizeGrade,
  updateGrade,
  deleteGrade
} from '../controllers/gradeController.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin, requireTeacher, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Student/Teacher routes (own data or assigned courses)
router.get('/student/:studentId', getStudentGrades);
router.get('/enrollment/:enrollmentId', getGradeByEnrollment);

// Teacher routes (assigned courses)
router.get('/offering/:offeringId', requireTeacher, getOfferingGrades);
router.post('/', checkPermission('grade', 'create'), createGrade);
router.put('/:id', checkPermission('grade', 'update'), updateGrade);
router.put('/:id/finalize', requireTeacher, finalizeGrade);

// Admin routes
router.get('/', requireAdmin, getGrades);
router.delete('/:id', checkPermission('grade', 'delete'), deleteGrade);

export default router;
