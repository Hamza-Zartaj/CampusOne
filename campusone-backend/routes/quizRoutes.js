import express from 'express';
import multer from 'multer';
import { protect as authenticate, authorize } from '../middleware/auth.js';
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  importQuestionsFromExcel,
  downloadQuizImportTemplate,
  getQuizAttempts,
  getAttemptDetail,
  gradeAnswer,
} from '../controllers/quizController.js';
import {
  getMyQuizzes,
  startAttempt,
  saveAnswer,
  logViolation,
  submitAttempt,
  getMyAttemptResult,
} from '../controllers/quizAttemptController.js';
import { generateAIQuizQuestions } from '../controllers/aiQuizController.js';

const router = express.Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  },
});

// ─── STUDENT routes (declared before /:id to avoid conflict) ─────────
router.get('/my', authenticate, authorize('student'), getMyQuizzes);
router.post('/:id/start', authenticate, authorize('student'), startAttempt);
router.put('/attempts/:attemptId/answer', authenticate, authorize('student'), saveAnswer);
router.post('/attempts/:attemptId/violation', authenticate, authorize('student'), logViolation);
router.post('/attempts/:attemptId/submit', authenticate, authorize('student'), submitAttempt);
router.get('/attempts/:attemptId/result', authenticate, authorize('student'), getMyAttemptResult);

// ─── TEACHER routes ──────────────────────────────────────────────────
router.get('/', authenticate, authorize('teacher'), getQuizzes);
router.post('/', authenticate, authorize('teacher'), createQuiz);
router.post('/ai/generate', authenticate, authorize('teacher'), generateAIQuizQuestions);
router.get('/import-excel/template', authenticate, authorize('teacher'), downloadQuizImportTemplate);
router.post('/import-excel', authenticate, authorize('teacher'), excelUpload.single('file'), importQuestionsFromExcel);
router.get('/:id', authenticate, authorize('teacher'), getQuizById);
router.put('/:id', authenticate, authorize('teacher'), updateQuiz);
router.delete('/:id', authenticate, authorize('teacher'), deleteQuiz);
router.get('/:id/attempts', authenticate, authorize('teacher'), getQuizAttempts);
router.get('/teacher/attempts/:attemptId', authenticate, authorize('teacher'), getAttemptDetail);
router.put('/answers/:answerId/grade', authenticate, authorize('teacher'), gradeAnswer);

export default router;
