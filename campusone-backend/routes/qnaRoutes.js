import express from 'express';
import { protect as authenticate } from '../middleware/auth.js';
import {
  getThreads,
  getThreadById,
  createThread,
  createReply,
  updateThreadStatus,
  deleteThread,
  deleteReply,
} from '../controllers/qnaController.js';

const router = express.Router();

router.get('/', authenticate, getThreads);
router.post('/', authenticate, createThread);
router.delete('/replies/:replyId', authenticate, deleteReply);
router.get('/:id', authenticate, getThreadById);
router.post('/:id/replies', authenticate, createReply);
router.put('/:id/status', authenticate, updateThreadStatus);
router.delete('/:id', authenticate, deleteThread);

export default router;
