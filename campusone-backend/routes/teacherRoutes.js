import express from 'express';
import { 
  getAllTeachers, 
  getTeacherById, 
  getTeacherByUserId 
} from '../controllers/teacherController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected routes for getting teacher info (any authenticated user can view teachers)
router.get('/', protect, getAllTeachers);
router.get('/user/:userId', protect, getTeacherByUserId);
router.get('/:id', protect, getTeacherById);

export default router;
