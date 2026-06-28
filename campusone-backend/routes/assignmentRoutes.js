import express from 'express';
import multer from 'multer';
import { protect as authenticate, authorize } from '../middleware/auth.js';
import {
  getAssignments,
  getMyAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getSubmissions,
  gradeSubmission,
  approvePendingSubmissionGrade,
  rejectPendingSubmissionGrade,
  submitAssignment,
  getMySubmission,
} from '../controllers/assignmentController.js';
import {
  getLatestSimilarityReport,
  reviewSimilarityMatch,
  runStageOneSimilarityScan,
  runStageTwoSimilarityScan,
} from '../controllers/assignmentSimilarityController.js';

const router = express.Router();

// multer with memory storage — files are uploaded to Supabase, not disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type. Allowed: PDF, DOC, DOCX, images, TXT'));
  },
});

// Teacher / admin routes
router.get('/', authenticate, getAssignments);
router.post('/', authenticate, upload.single('file'), createAssignment);
router.get('/my', authenticate, getMyAssignments);            // student
router.get('/:id', authenticate, getAssignmentById);
router.put('/:id', authenticate, upload.single('file'), updateAssignment);
router.delete('/:id', authenticate, deleteAssignment);
router.get('/:id/submissions', authenticate, getSubmissions);
router.post('/:id/similarity/scan', authenticate, authorize('teacher'), runStageOneSimilarityScan);
router.post('/:id/similarity/ai-scan', authenticate, authorize('teacher'), runStageTwoSimilarityScan);
router.put('/:id/similarity/matches/:matchId/review', authenticate, authorize('teacher'), reviewSimilarityMatch);
router.get('/:id/similarity/latest', authenticate, authorize('teacher'), getLatestSimilarityReport);

// Submission routes (scoped under assignment)
router.post('/:id/submit', authenticate, upload.single('file'), submitAssignment);
router.get('/:id/my-submission', authenticate, getMySubmission);

// Grade a specific submission
router.put('/pending-grades/:id/approve', authenticate, authorize('teacher', 'admin'), approvePendingSubmissionGrade);
router.put('/pending-grades/:id/reject', authenticate, authorize('teacher', 'admin'), rejectPendingSubmissionGrade);
router.put('/submissions/:id/grade', authenticate, gradeSubmission);

export default router;
