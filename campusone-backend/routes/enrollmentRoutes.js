import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/enrollmentController.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'teacher'), ctrl.getEnrollments);
router.get('/:id', protect, ctrl.getEnrollmentById);
router.post('/', protect, authorize('admin'), ctrl.enrollStudent);
router.delete('/:id', protect, authorize('admin'), ctrl.dropEnrollment);
router.put('/:id/grade', protect, authorize('teacher', 'admin'), ctrl.updateGrade);
router.post('/bulk-grade', protect, authorize('teacher', 'admin'), ctrl.bulkGrade);

// Student-scoped routes (also accessible by admin)
router.get('/students/:studentId/transcript', protect, ctrl.getTranscript);
router.get('/students/:studentId/cgpa', protect, ctrl.getStudentCGPA);
router.get('/students/:studentId/current', protect, ctrl.getCurrentEnrollments);

export default router;
