import express from 'express';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/leaveController.js';

const router = express.Router();

router.use(protect);

// Admin policy
router.get('/policy', authorizePermission('manage_academic'), ctrl.getPolicy);
router.put('/policy', authorizePermission('manage_academic'), ctrl.updatePolicy);

// Student
router.get('/my', authorize('student'), ctrl.getMyLeaveStatus);
router.get('/my/fines', authorize('student'), ctrl.getMyFines);
router.post('/applications', authorize('student'), ctrl.submitLeaveApplication);

// Teacher / Admin
router.get('/offering/:offeringId', authorize('teacher', 'admin'), ctrl.getOfferingLeaveStatus);
router.get('/applications/teacher/pending', authorize('teacher'), ctrl.getPendingForTeacher);
router.put('/applications/:id/approve', authorize('teacher', 'admin'), ctrl.approveApplication);
router.put('/applications/:id/reject', authorize('teacher', 'admin'), ctrl.rejectApplication);

// Shared
router.get('/applications/:id', ctrl.getApplication);

export default router;
