import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/roomController.js';

const router = express.Router();

router.get('/', protect, ctrl.getAllRooms);
router.post('/', protect, authorizePermission('manage_academic'), ctrl.createRoom);
router.put('/:id', protect, authorizePermission('manage_academic'), ctrl.updateRoom);
router.delete('/:id', protect, authorizePermission('manage_academic'), ctrl.deleteRoom);

export default router;
