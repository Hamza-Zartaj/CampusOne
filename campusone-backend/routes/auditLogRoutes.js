import { Router } from 'express';
import { protect as authenticate } from '../middleware/auth.js';
import { getAuditLogs, getCategories } from '../controllers/auditLogController.js';

const router = Router();

// Admin-only — both routes require authentication + admin role enforced in middleware
router.get('/', authenticate, getAuditLogs);
router.get('/categories', authenticate, getCategories);

export default router;
