import express from 'express';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/courseOfferingController.js';
import * as scheduleCtrl from '../controllers/scheduleController.js';
import * as markCtrl from '../controllers/markComponentController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllOfferings);
router.get('/my', protect, authorize('teacher'), ctrl.getMyOfferings);
router.get('/:id', protect, ctrl.getOfferingById);
router.get('/:id/students', protect, authorize('teacher', 'admin'), ctrl.getOfferingStudents);
router.get('/:id/sessions', protect, scheduleCtrl.getOfferingSessions);
router.post('/:id/sessions', protect, authorizePermission('manage_offerings'), scheduleCtrl.setOfferingSessions);
router.get('/:id/mark-components', protect, authorize('teacher', 'admin'), markCtrl.listForOffering);
router.post('/:id/mark-components/init', protect, authorize('teacher', 'admin'), markCtrl.initForOffering);
router.post('/', protect, authorizePermission('manage_offerings'), ctrl.createOffering);
router.put('/:id', protect, authorizePermission('manage_offerings'), ctrl.updateOffering);
router.delete('/:id', protect, authorizePermission('manage_offerings'), ctrl.deleteOffering);

export default router;
