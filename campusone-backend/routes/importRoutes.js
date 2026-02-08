import express from 'express';
import {
  importCourses,
  importCurriculum,
  importOfferings,
  getCSVTemplate,
  getAuditLogs,
  getEntityAuditTrail
} from '../controllers/importController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes - Admin only
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// CSV Templates
router.get('/templates/:type', getCSVTemplate);

// Import endpoints
router.post('/courses', importCourses);
router.post('/curriculum', importCurriculum);
router.post('/offerings', importOfferings);

// Audit logs
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/:model/:id', getEntityAuditTrail);

export default router;
