import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/lectureController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/', protect, ctrl.listLectures);
router.post('/', protect, authorize('teacher', 'admin'), upload.single('material'), ctrl.createLecture);
router.put('/:id', protect, authorize('teacher', 'admin'), upload.single('material'), ctrl.updateLecture);
router.delete('/:id', protect, authorize('teacher', 'admin'), ctrl.deleteLecture);

export default router;
