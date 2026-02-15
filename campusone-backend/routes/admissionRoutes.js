import express from 'express';
const router = express.Router();
import {
  getAdmissionSettings,
  updateAdmissionSettings,
  submitApplication,
  getAllApplications,
  getApplication,
  updateApplicationStatus,
  getApplicationStatistics,
  uploadDocuments,
  deleteDocument,
  getApplicationDocuments
} from '../controllers/admissionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadAdmissionDocuments, handleUploadErrors } from '../middleware/uploadMiddleware.js';

// Public routes
router.get('/settings', getAdmissionSettings);
router.post('/apply', submitApplication);

// Admin only routes
router.put('/settings', protect, authorize('admin'), updateAdmissionSettings);
router.get('/applications', protect, authorize('admin'), getAllApplications);
router.get('/applications/:id', protect, getApplication);
router.put('/applications/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.get('/statistics', protect, authorize('admin'), getApplicationStatistics);

// Document upload routes (Public for applicants, with app-level authorization check)
router.post('/applications/:id/documents', 
  (req, res, next) => {
    uploadAdmissionDocuments.array('documents', 5)(req, res, (err) => {
      if (err) {
        console.error('[Upload Route] Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 10MB'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum is 5 files'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          console.error('[Upload Route] Unexpected field in form data:', err.field);
          return res.status(400).json({
            success: false,
            message: 'Unexpected field in form data. Only "documents" field is allowed.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading files'
        });
      }
      next();
    });
  },
  uploadDocuments
);

router.get('/applications/:id/documents', 
  getApplicationDocuments
);

router.delete('/applications/:id/documents/:docIndex', 
  deleteDocument
);

export default router;
