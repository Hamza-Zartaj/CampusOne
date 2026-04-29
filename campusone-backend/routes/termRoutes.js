import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/termController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllTerms);
router.get('/active', protect, ctrl.getActiveTerm);
router.get('/:id', protect, ctrl.getTermById);
router.post('/', protect, authorize('admin'), ctrl.createTerm);
router.put('/:id', protect, authorize('admin'), ctrl.updateTerm);
router.put('/:id/activate', protect, authorize('admin'), ctrl.activateTerm);

export default router;
