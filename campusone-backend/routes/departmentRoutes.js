import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/departmentController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllDepartments);
router.get('/:id', protect, ctrl.getDepartmentById);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createDepartment);
router.put('/:id', protect, authorizePermission('manage_academic'), ctrl.updateDepartment);
router.delete('/:id', protect, authorizePermission('manage_academic'), ctrl.deleteDepartment);
router.put('/:id/restore', protect, authorizePermission('manage_academic'), ctrl.restoreDepartment);

export default router;
