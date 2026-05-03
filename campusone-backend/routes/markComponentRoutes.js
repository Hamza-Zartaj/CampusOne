import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/markComponentController.js';

const router = express.Router();

router.put('/:id', protect, authorize('teacher', 'admin'), ctrl.updateMarkComponent);

export default router;
