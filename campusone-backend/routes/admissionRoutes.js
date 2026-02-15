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
  getApplicationDocuments,
  checkDuplicateEmail,
  checkDuplicateCNIC,
  checkDuplicatePhone
} from '../controllers/admissionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadAdmissionDocuments, handleUploadErrors } from '../middleware/uploadMiddleware.js';

// Public routes
router.get('/settings', getAdmissionSettings);
router.post('/apply', submitApplication);

// Duplicate check routes (Public)
router.get('/check-email/:email', checkDuplicateEmail);
router.get('/check-cnic/:cnic', checkDuplicateCNIC);
router.get('/check-phone/:phone', checkDuplicatePhone);

// Admin only routes
router.put('/settings', protect, authorize('admin'), updateAdmissionSettings);
router.get('/applications', protect, authorize('admin'), getAllApplications);
router.get('/applications/:id', protect, getApplication);
router.put('/applications/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.get('/statistics', protect, authorize('admin'), getApplicationStatistics);

// Document upload routes (Public for applicants, with app-level authorization check)
router.post('/applications/:id/documents', 
  (req, res, next) => {
    // Use .any() to accept all fields (files and non-file fields like fileMetadata)
    uploadAdmissionDocuments.any()(req, res, (err) => {
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
