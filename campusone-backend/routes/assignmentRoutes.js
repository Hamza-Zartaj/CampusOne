import express from 'express';
import multer from 'multer';
import { protect as authenticate } from '../middleware/auth.js';
import {
  getAssignments,
  getMyAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getSubmissions,
  gradeSubmission,
  submitAssignment,
  getMySubmission,
} from '../controllers/assignmentController.js';

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
      'application/zip',
      'application/x-zip-compressed',
      'image/jpeg', 'image/png',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type. Allowed: PDF, DOC, DOCX, ZIP, images, TXT'));
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

// Submission routes (scoped under assignment)
router.post('/:id/submit', authenticate, upload.single('file'), submitAssignment);
router.get('/:id/my-submission', authenticate, getMySubmission);

// Grade a specific submission
router.put('/submissions/:id/grade', authenticate, gradeSubmission);

export default router;
