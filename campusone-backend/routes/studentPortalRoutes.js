import express from 'express';
import {
  getMyProfile,
  getCurrentCourses,
  getAvailableOfferings,
  enrollInCourse,
  dropCourse,
  swapSection,
  getMyTimetable,
  getMyGrades,
  getMyTranscript,
  getMyCGPA,
  getMyWaitlist,
  checkMyPrerequisites
} from '../controllers/studentPortalController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes and require student role
router.use(protect);
router.use(authorize('student', 'admin', 'super_admin'));

// Profile
router.get('/profile', getMyProfile);

// Current courses and timetable
router.get('/current-courses', getCurrentCourses);
router.get('/timetable', getMyTimetable);

// Available offerings for enrollment
router.get('/available-offerings', getAvailableOfferings);

// Enrollment actions
router.post('/enroll', enrollInCourse);
router.put('/drop/:enrollmentId', dropCourse);
router.put('/swap', swapSection);

// Waitlist
router.get('/waitlist', getMyWaitlist);

// Grades and transcript
router.get('/grades', getMyGrades);
router.get('/transcript', getMyTranscript);
router.get('/cgpa', getMyCGPA);

// Prerequisites check
router.get('/check-prerequisites/:courseId', checkMyPrerequisites);

export default router;
