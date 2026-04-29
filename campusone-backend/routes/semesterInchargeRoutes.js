import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/semesterInchargeController.js';

const router = express.Router();

router.get('/', protect, authorize('admin'), ctrl.getIncharges);
router.get('/my', protect, authorize('teacher'), ctrl.getMyInchargeAssignments);
router.post('/', protect, authorize('admin'), ctrl.assignIncharge);
router.put('/:id/relieve', protect, authorize('admin'), ctrl.relieveIncharge);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteIncharge);

export default router;
