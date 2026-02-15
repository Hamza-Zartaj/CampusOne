import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const admissionUploadsDir = path.join(uploadsDir, 'admission-applications');

// Ensure directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(admissionUploadsDir)) {
  fs.mkdirSync(admissionUploadsDir, { recursive: true });
}

// Configure storage for admission documents
const admissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, admissionUploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

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

// Utility function to get file URL
export const getFileUrl = (filename) => {
  return `/uploads/admission-applications/${filename}`;
};

// Utility function to delete file
export const deleteFile = (filename) => {
  try {
    const filePath = path.join(admissionUploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};
