import { Router } from 'express';
import { protect as authenticate, authorizePermission } from '../middleware/auth.js';
import { getAuditLogs, getCategories } from '../controllers/auditLogController.js';

const router = Router();

router.get('/', authenticate, authorizePermission('view_audit_logs'), getAuditLogs);
router.get('/categories', authenticate, authorizePermission('view_audit_logs'), getCategories);

export default router;
