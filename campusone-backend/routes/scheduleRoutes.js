import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/scheduleController.js';

const router = express.Router();

router.get('/config', protect, ctrl.getConfig);
router.put('/config', protect, authorizePermission('manage_academic'), ctrl.updateConfig);
router.get('/slots', protect, ctrl.getSlots);
router.get('/availability', protect, ctrl.getAvailability);

export default router;
