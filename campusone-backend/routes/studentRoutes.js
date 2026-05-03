import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/studentController.js';

const router = express.Router();

router.get('/me/courses',                          protect, authorize('student'), ctrl.myCourses);
router.get('/me/course-detail/:offeringId',        protect, authorize('student'), ctrl.courseDetail);
router.get('/me/active-assignments',               protect, authorize('student'), ctrl.activeAssignments);
router.get('/me/active-quizzes',                   protect, authorize('student'), ctrl.activeQuizzes);

export default router;
