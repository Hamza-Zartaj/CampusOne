import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/courseOfferingController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllOfferings);
router.get('/my', protect, authorize('teacher'), ctrl.getMyOfferings);
router.get('/:id', protect, ctrl.getOfferingById);
router.get('/:id/students', protect, authorize('teacher', 'admin'), ctrl.getOfferingStudents);
router.post('/', protect, authorize('admin'), ctrl.createOffering);
router.put('/:id', protect, authorize('admin'), ctrl.updateOffering);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteOffering);

export default router;
