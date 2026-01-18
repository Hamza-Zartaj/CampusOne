import express from 'express';
const router = express.Router();
import {
  getAdmissionSettings,
  updateAdmissionSettings,
  submitApplication,
  getAllApplications,
  getApplication,
  updateApplicationStatus,
  getApplicationStatistics
} from '../controllers/admissionController.js';
import { protect, authorize } from '../middleware/auth.js';

// Public routes
router.get('/settings', getAdmissionSettings);
router.post('/apply', submitApplication);

// Admin only routes
router.put('/settings', protect, authorize('admin'), updateAdmissionSettings);
router.get('/applications', protect, authorize('admin'), getAllApplications);
router.get('/applications/:id', protect, getApplication);
router.put('/applications/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.get('/statistics', protect, authorize('admin'), getApplicationStatistics);

export default router;
