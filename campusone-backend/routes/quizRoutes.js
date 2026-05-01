import express from 'express';
import multer from 'multer';
import { protect as authenticate } from '../middleware/auth.js';
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  importQuestionsFromExcel,
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
router.get('/my', authenticate, getMyQuizzes);
router.post('/:id/start', authenticate, startAttempt);
router.put('/attempts/:attemptId/answer', authenticate, saveAnswer);
router.post('/attempts/:attemptId/violation', authenticate, logViolation);
router.post('/attempts/:attemptId/submit', authenticate, submitAttempt);
router.get('/attempts/:attemptId/result', authenticate, getMyAttemptResult);

// ─── TEACHER routes ──────────────────────────────────────────────────
router.get('/', authenticate, getQuizzes);
router.post('/', authenticate, createQuiz);
router.post('/import-excel', authenticate, excelUpload.single('file'), importQuestionsFromExcel);
router.get('/:id', authenticate, getQuizById);
router.put('/:id', authenticate, updateQuiz);
router.delete('/:id', authenticate, deleteQuiz);
router.get('/:id/attempts', authenticate, getQuizAttempts);
router.get('/teacher/attempts/:attemptId', authenticate, getAttemptDetail);
router.put('/answers/:answerId/grade', authenticate, gradeAnswer);

export default router;
