import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/programController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllPrograms);
router.get('/:id', protect, ctrl.getProgramById);
router.get('/:id/curriculum', protect, ctrl.getProgramCurriculum);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createProgram);
router.put('/:id', protect, authorizePermission('manage_academic'), ctrl.updateProgram);
router.delete('/:id', protect, authorizePermission('manage_academic'), ctrl.deleteProgram);

export default router;
