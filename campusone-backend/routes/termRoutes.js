import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/termController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllTerms);
router.get('/active', protect, ctrl.getActiveTerm);
router.get('/:id', protect, ctrl.getTermById);
router.get('/:id/batches', protect, ctrl.getTermBatches);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createTerm);
router.put('/:id', protect, authorizePermission('manage_academic'), ctrl.updateTerm);
router.put('/:id/activate', protect, authorizePermission('manage_academic'), ctrl.activateTerm);

export default router;
