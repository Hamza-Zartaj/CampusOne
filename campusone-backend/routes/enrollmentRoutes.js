import express from 'express';
import {
  enrollStudent,
  dropEnrollment,
  withdrawEnrollment,
  getWaitlist,
  getWaitlistPosition,
  updateGrade,
  getTranscript,
  calculateCGPA,
  getEnrollments,
  getEnrollment,
  getStudentEnrollments,
  getCourseOfferingEnrollments,
  bulkEnroll,
  deleteEnrollment,
  restoreEnrollment,
  activateEnrollment,
  checkPrerequisitesEndpoint,
  getSemesterSummary
} from '../controllers/enrollmentController.js';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Check prerequisites (query params: studentId, courseId)
router.get('/check-prerequisites', checkPrerequisitesEndpoint);

// Transcript and CGPA
router.get('/transcript/:studentId', getTranscript);
router.get('/cgpa/:studentId', calculateCGPA);

// Semester summary
router.get('/semester-summary/:studentId/:academicYear/:semesterNumber', getSemesterSummary);

// Waitlist routes
router.get('/waitlist/:courseOfferingId', getWaitlist);
router.get('/waitlist-position/:enrollmentId', getWaitlistPosition);

// Student enrollments
router.get('/student/:studentId', getStudentEnrollments);

// Course offering enrollments
router.get('/offering/:courseOfferingId', getCourseOfferingEnrollments);

// Bulk enrollment (Admin only)
router.post('/bulk', authorize('admin', 'super_admin'), bulkEnroll);

// CRUD routes
router.route('/')
  .get(getEnrollments)
  .post(enrollStudent);

router.route('/:id')
  .get(getEnrollment)
  .delete(authorize('admin', 'super_admin'), deleteEnrollment);

// Enrollment actions
router.put('/:id/drop', dropEnrollment);
router.put('/:id/withdraw', withdrawEnrollment);
router.put('/:id/activate', activateEnrollment);
router.put('/:id/restore', authorize('admin', 'super_admin'), restoreEnrollment);

// Grade update (Teacher/Admin)
router.put('/:id/grade', authorize('admin', 'super_admin', 'teacher'), updateGrade);

export default router;
