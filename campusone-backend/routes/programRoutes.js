import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/programController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllPrograms);
router.get('/:id', protect, ctrl.getProgramById);
router.get('/:id/curriculum', protect, ctrl.getProgramCurriculum);
router.post('/', protect, authorize('admin'), ctrl.createProgram);
router.put('/:id', protect, authorize('admin'), ctrl.updateProgram);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteProgram);

export default router;
