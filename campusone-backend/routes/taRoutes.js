import express from 'express';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/taController.js';

const router = express.Router();

router.use(protect);

// Student
router.get('/eligibility', authorize('student'), ctrl.getMyEligibility);
router.get('/my', authorize('student'), ctrl.getMyAssignments);
router.get('/my/active', authorize('student'), ctrl.getMyActiveAssignments);
router.post('/applications', authorize('student'), ctrl.applyForTA);

// Teacher
router.get('/teacher/applications', authorize('teacher'), ctrl.getTeacherApplications);
router.put('/applications/:id/approve', authorize('teacher', 'admin'), ctrl.approveApplication);
router.put('/applications/:id/reject', authorize('teacher', 'admin'), ctrl.rejectApplication);
router.put('/applications/:id/relieve', authorize('teacher', 'admin'), ctrl.relieveAssignment);

// Admin oversight
router.get('/', authorizePermission('manage_offerings'), ctrl.getAllAssignments);

export default router;
