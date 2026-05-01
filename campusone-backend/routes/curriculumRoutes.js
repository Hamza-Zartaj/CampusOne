import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/curriculumController.js';

const router = express.Router();

router.get('/', protect, ctrl.getCurriculaByProgram);
router.get('/:id', protect, ctrl.getCurriculumById);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createCurriculum);
router.put('/:id', protect, authorizePermission('manage_academic'), ctrl.updateCurriculum);
router.post('/:id/clone', protect, authorizePermission('manage_academic'), ctrl.cloneCurriculum);
router.post('/:id/courses', protect, authorizePermission('manage_academic'), ctrl.addCourseToCurriculum);
router.put('/:id/courses/:courseId', protect, authorizePermission('manage_academic'), ctrl.updateCurriculumCourse);
router.delete('/:id/courses/:courseId', protect, authorizePermission('manage_academic'), ctrl.removeCourseFromCurriculum);

export default router;
