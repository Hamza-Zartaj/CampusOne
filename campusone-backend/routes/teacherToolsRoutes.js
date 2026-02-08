import express from 'express';
import {
  getMyOfferings,
  getEnrolledStudents,
  uploadStudentMarks,
  bulkUploadMarks,
  submitStudentGrade,
  submitFinalGrades,
  lockResults,
  unlockResults,
  getGradeSummary,
  exportGrades,
  getMarksTemplate
} from '../controllers/teacherToolsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Teacher routes - require teacher or admin role
router.use(authorize('teacher', 'admin', 'super_admin'));

// Get my course offerings
router.get('/my-offerings', getMyOfferings);

// Students & Marks for a specific offering
router.get('/offerings/:offeringId/students', getEnrolledStudents);
router.get('/offerings/:offeringId/marks-template', getMarksTemplate);
router.put('/offerings/:offeringId/bulk-marks', bulkUploadMarks);

// Grade management for offerings
router.get('/offerings/:offeringId/grade-summary', getGradeSummary);
router.put('/offerings/:offeringId/submit-grades', submitFinalGrades);
router.get('/offerings/:offeringId/export-grades', exportGrades);

// Results lock
router.put('/offerings/:offeringId/lock-results', lockResults);
router.put('/offerings/:offeringId/unlock-results', authorize('admin', 'super_admin'), unlockResults);

// Individual enrollment actions
router.put('/enrollments/:enrollmentId/marks', uploadStudentMarks);
router.put('/enrollments/:enrollmentId/grade', submitStudentGrade);

export default router;
