import express from 'express';
import { protect as authenticate } from '../middleware/auth.js';
import {
  markAttendance,
  getSessions,
  getSessionDetail,
  getStudentSummary,
  getMyAttendance,
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/my', authenticate, getMyAttendance);                                   // student
router.post('/', authenticate, markAttendance);                                     // teacher
router.get('/offering/:offeringId/sessions', authenticate, getSessions);            // teacher
router.get('/offering/:offeringId/sessions/:date', authenticate, getSessionDetail); // teacher
router.get('/offering/:offeringId/students', authenticate, getStudentSummary);      // teacher

export default router;
