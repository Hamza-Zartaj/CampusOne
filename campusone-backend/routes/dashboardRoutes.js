import express from 'express';
import { protect as authenticate } from '../middleware/auth.js';
import {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/admin', authenticate, getAdminDashboard);
router.get('/teacher', authenticate, getTeacherDashboard);
router.get('/student', authenticate, getStudentDashboard);

export default router;
