import express from 'express';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/semesterInchargeController.js';

const router = express.Router();

router.get('/', protect, authorizePermission('manage_offerings'), ctrl.getIncharges);
router.get('/my', protect, authorize('teacher'), ctrl.getMyInchargeAssignments);
router.post('/', protect, authorizePermission('manage_offerings'), ctrl.assignIncharge);
router.put('/:id/relieve', protect, authorizePermission('manage_offerings'), ctrl.relieveIncharge);
router.delete('/:id', protect, authorizePermission('manage_offerings'), ctrl.deleteIncharge);

export default router;
