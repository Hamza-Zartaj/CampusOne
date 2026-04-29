import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/courseController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllCourses);
router.get('/:id', protect, ctrl.getCourseById);
router.post('/', protect, authorize('admin'), ctrl.createCourse);
router.put('/:id', protect, authorize('admin'), ctrl.updateCourse);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteCourse);
router.post('/:id/prerequisites', protect, authorize('admin'), ctrl.addPrerequisite);
router.delete('/:id/prerequisites/:prereqId', protect, authorize('admin'), ctrl.removePrerequisite);

export default router;
