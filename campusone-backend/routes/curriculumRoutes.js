import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/curriculumController.js';

const router = express.Router();

router.get('/', protect, ctrl.getCurriculaByProgram);
router.get('/:id', protect, ctrl.getCurriculumById);
router.post('/', protect, authorize('admin'), ctrl.createCurriculum);
router.put('/:id', protect, authorize('admin'), ctrl.updateCurriculum);
router.post('/:id/clone', protect, authorize('admin'), ctrl.cloneCurriculum);
router.post('/:id/courses', protect, authorize('admin'), ctrl.addCourseToCurriculum);
router.put('/:id/courses/:courseId', protect, authorize('admin'), ctrl.updateCurriculumCourse);
router.delete('/:id/courses/:courseId', protect, authorize('admin'), ctrl.removeCourseFromCurriculum);

export default router;
