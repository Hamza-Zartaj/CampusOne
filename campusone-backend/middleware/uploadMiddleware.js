import multer from 'multer';
import path from 'path';

// Use memory storage — files are available as file.buffer for Supabase upload
const admissionStorage = multer.memoryStorage();

// File filter for admission documents
const admissionFileFilter = (req, file, cb) => {
  // Allowed file types for admission documents
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, Images (JPEG, PNG), Word documents'));
  }
};

// Create multer instance for admission uploads
export const uploadAdmissionDocuments = multer({
  storage: admissionStorage,
  fileFilter: admissionFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  }
});

// Middleware to handle upload errors
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('[Upload Middleware] Multer error:', err.code, err.message);
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
      return res.status(400).json({
        success: false,
        message: `Unexpected field: ${err.field}. Only "documents" field is allowed.`
      });
    }
  }

  if (err && err.message) {
    console.error('[Upload Middleware] Upload error:', err.message);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next();
};

// Stub kept for backward-compatibility with deleteDocument (no-op for Supabase-stored files)
export const getFileUrl = (_filename) => null;

// Stub kept for backward-compatibility; actual deletion from Supabase is handled separately
export const deleteFile = (_filename) => false;
