import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/courseController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllCourses);
router.get('/:id', protect, ctrl.getCourseById);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createCourse);
router.put('/:id', protect, authorizePermission('manage_academic'), ctrl.updateCourse);
router.delete('/:id', protect, authorizePermission('manage_academic'), ctrl.deleteCourse);
router.post('/:id/prerequisites', protect, authorizePermission('manage_academic'), ctrl.addPrerequisite);
router.delete('/:id/prerequisites/:prereqId', protect, authorizePermission('manage_academic'), ctrl.removePrerequisite);

export default router;
