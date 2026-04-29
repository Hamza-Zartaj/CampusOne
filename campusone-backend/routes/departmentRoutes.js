import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/departmentController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllDepartments);
router.get('/:id', protect, ctrl.getDepartmentById);
router.post('/', protect, authorize('admin'), ctrl.createDepartment);
router.put('/:id', protect, authorize('admin'), ctrl.updateDepartment);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteDepartment);
router.put('/:id/restore', protect, authorize('admin'), ctrl.restoreDepartment);

export default router;
