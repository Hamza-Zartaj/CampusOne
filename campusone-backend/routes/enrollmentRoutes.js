import express from 'express';
import multer from 'multer';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/enrollmentController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/bulk-import/template', protect, authorizePermission('manage_offerings'), ctrl.bulkImportTemplate);
router.post('/bulk-import', protect, authorizePermission('manage_offerings'), upload.single('file'), ctrl.bulkImport);

router.get('/', protect, authorize('admin', 'teacher'), ctrl.getEnrollments);
router.get('/:id', protect, ctrl.getEnrollmentById);
router.post('/', protect, authorizePermission('manage_offerings'), ctrl.enrollStudent);
router.delete('/:id', protect, authorizePermission('manage_offerings'), ctrl.dropEnrollment);
router.put('/:id/transfer-section', protect, authorizePermission('manage_offerings'), ctrl.transferSection);
router.put('/:id/grade', protect, authorize('teacher', 'admin'), ctrl.updateGrade);
router.post('/bulk-grade', protect, authorize('teacher', 'admin'), ctrl.bulkGrade);

// Student-scoped routes (also accessible by admin)
router.get('/students/:studentId/transcript', protect, ctrl.getTranscript);
router.get('/students/:studentId/cgpa', protect, ctrl.getStudentCGPA);
router.get('/students/:studentId/current', protect, ctrl.getCurrentEnrollments);

export default router;
