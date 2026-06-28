import express from 'express';
import multer from 'multer';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/taController.js';
import * as resourceCtrl from '../controllers/taResourceController.js';

const router = express.Router();

const resourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type'));
  },
});

router.use(protect);

// Student
router.get('/eligibility', authorize('student'), ctrl.getMyEligibility);
router.get('/my', authorize('student'), ctrl.getMyAssignments);
router.get('/my/active', authorize('student'), ctrl.getMyActiveAssignments);
router.post('/applications', authorize('student'), ctrl.applyForTA);
router.get('/resources', authorize('student'), resourceCtrl.listResources);
router.post('/resources', authorize('student'), resourceUpload.single('file'), resourceCtrl.uploadResource);
router.delete('/resources/:id', authorize('student'), resourceCtrl.deleteResource);

// Teacher
router.get('/teacher/applications', authorize('teacher'), ctrl.getTeacherApplications);
router.put('/applications/:id/approve', authorize('teacher', 'admin'), ctrl.approveApplication);
router.put('/applications/:id/reject', authorize('teacher', 'admin'), ctrl.rejectApplication);
router.put('/applications/:id/relieve', authorize('teacher', 'admin'), ctrl.relieveAssignment);

// Admin oversight
router.get('/', authorizePermission('manage_offerings'), ctrl.getAllAssignments);

export default router;
