import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/holidayController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllHolidays);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createHoliday);
router.delete('/:id', protect, authorizePermission('manage_academic'), ctrl.deleteHoliday);

export default router;
