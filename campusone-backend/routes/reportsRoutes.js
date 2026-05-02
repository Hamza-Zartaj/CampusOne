import express from 'express';
import { protect, authorizePermission } from '../middleware/auth.js';
import * as ctrl from '../controllers/reportsController.js';

const router = express.Router();

router.use(protect, authorizePermission('view_reports'));

router.get('/overview', ctrl.getOverview);
router.get('/enrollment-by-program', ctrl.getEnrollmentByProgram);
router.get('/grade-distribution', ctrl.getGradeDistribution);
router.get('/course-performance', ctrl.getCoursePerformance);
router.get('/term-trends', ctrl.getTermTrends);
router.get('/admission-funnel', ctrl.getAdmissionFunnel);
router.get('/attendance-summary', ctrl.getAttendanceSummary);

export default router;
