import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/courseController.js';
import * as gradeCtrl from '../controllers/gradeComponentController.js';

const router = express.Router();

// IMPORTANT: /templates must be registered before /:id to avoid being matched as an id.
router.get('/templates', protect, gradeCtrl.getTemplates);

router.get('/', protect, ctrl.getAllCourses);
router.get('/:id', protect, ctrl.getCourseById);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createCourse);
router.put('/:id', protect, authorizePermission('manage_academic'), ctrl.updateCourse);
router.delete('/:id', protect, authorizePermission('manage_academic'), ctrl.deleteCourse);
router.post('/:id/prerequisites', protect, authorizePermission('manage_academic'), ctrl.addPrerequisite);
router.delete('/:id/prerequisites/:prereqId', protect, authorizePermission('manage_academic'), ctrl.removePrerequisite);

// Grade components per course
router.get('/:id/grade-components', protect, gradeCtrl.listForCourse);
router.post('/:id/grade-components', protect, authorizePermission('manage_academic'), gradeCtrl.replaceForCourse);
router.post('/:id/grade-components/apply-template', protect, authorizePermission('manage_academic'), gradeCtrl.applyTemplate);

export default router;
