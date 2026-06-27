import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';
import { uploadToBucket } from '../services/storageService.js';
import { auditLog } from '../utils/auditLogger.js';
import {
  sendAdmissionApplicationConfirmationEmail,
  sendApplicationUnderReviewEmail,
  sendApplicationAcceptanceEmail,
  sendApplicationRejectionEmail
} from '../services/emailService.js';

// @desc    Get admission settings
// @route   GET /api/admissions/settings
// @access  Public
export const getAdmissionSettings = async (req, res) => {
  try {
    const settings = await prisma.admissionSettings.findFirst();
    if (!settings) {
      return res.status(200).json({
        success: true,
        data: {
          isOpen: false,
          instructions: '',
          requiresDocuments: false,
          requiredDocuments: []
        }
      });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    logger.error('Error fetching admission settings:', error);
    res.status(500).json({ success: false, message: 'Error fetching admission settings' });
  }
};

// @desc    Update admission settings (Admin only)
// @route   PUT /api/admissions/settings
// @access  Private/Admin
export const updateAdmissionSettings = async (req, res) => {
  try {
    const existing = await prisma.admissionSettings.findFirst();
    const data = {};
    if (req.body.isOpen !== undefined) data.isOpen = req.body.isOpen;
    if (req.body.startDate !== undefined) data.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    if (req.body.endDate !== undefined) data.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    if (req.body.instructions !== undefined) data.instructions = req.body.instructions;
    if (req.body.requiresDocuments !== undefined) data.requiresDocuments = req.body.requiresDocuments;
    if (req.body.requiredDocuments !== undefined) data.requiredDocuments = req.body.requiredDocuments;

    let settings;
    if (existing) {
      settings = await prisma.admissionSettings.update({ where: { id: existing.id }, data });
    } else {
      settings = await prisma.admissionSettings.create({ data });
    }

    auditLog({
      action: 'UPDATE_ADMISSION_SETTINGS', category: 'ADMISSION',
      performedBy: req.user.id, performedByRole: req.user.role,
      targetModel: 'AdmissionSettings', targetId: settings.id,
      description: `Updated admission settings — admissions ${data.isOpen !== undefined ? (data.isOpen ? 'opened' : 'closed') : 'updated'}`,
      newValue: data,
    });
    res.status(200).json({ success: true, message: 'Admission settings updated successfully', data: settings });
  } catch (error) {
    logger.error('Error updating admission settings:', error);
    res.status(500).json({ success: false, message: 'Error updating admission settings' });
  }
};

// @desc    Submit admission application
// @route   POST /api/admissions/apply
// @access  Public
export const submitApplication = async (req, res) => {
  try {
    // Check for duplicate email
    const existingEmail = await prisma.admissionApplication.findFirst({
      where: { email: req.body.email.toLowerCase() }
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An application with this email already exists. Each applicant can only submit one application.'
      });
    }

    // Check for duplicate CNIC
    const existingCNIC = await prisma.admissionApplication.findFirst({
      where: { cnic: req.body.cnic }
    });
    if (existingCNIC) {
      return res.status(400).json({
        success: false,
        message: 'An application with this CNIC already exists. Each applicant can only submit one application.'
      });
    }

    // Check for duplicate phone number
    const existingPhone = await prisma.admissionApplication.findFirst({
      where: { phone: req.body.phone }
    });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'An application with this phone number already exists. Each applicant can only submit one application.'
      });
    }

    // Generate application number
    const count = await prisma.admissionApplication.count();
    const applicationNumber = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Create application
    const application = await prisma.admissionApplication.create({
      data: {
        applicationNumber,
        fullName: req.body.fullName,
        email: req.body.email.toLowerCase(),
        phone: req.body.phone,
        cnic: req.body.cnic,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        gender: req.body.gender,
        program: req.body.program,
        address: req.body.address || {},
        guardian: req.body.guardian || {},
        educationRecords: req.body.educationRecords || [],
        documents: [],
        applicationStatus: 'Pending',
        applicationDate: new Date(),
        userId: req.user ? req.user.id : null
      }
    });

    // Send confirmation email to applicant
    try {
      await sendAdmissionApplicationConfirmationEmail(
        application.email,
        application.fullName,
        application.applicationNumber,
        application.program
      );
    } catch (emailError) {
      logger.error('Email sending failed (non-blocking):', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        status: application.applicationStatus
      }
    });
  } catch (error) {
    logger.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message
    });
  }
};

// @desc    Get all applications (Admin only)
// @route   GET /api/admissions/applications
// @access  Private/Admin
export const getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) {
      where.applicationStatus = status;
    }

    const applications = await prisma.admissionApplication.findMany({
      where,
      orderBy: { applicationDate: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });

    const count = await prisma.admissionApplication.count({ where });

    res.status(200).json({
      success: true,
      data: applications,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    logger.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

// @desc    Get single application
// @route   GET /api/admissions/applications/:id
// @access  Private/Admin or Owner
export const getApplication = async (req, res) => {
  try {
    const application = await prisma.admissionApplication.findUnique({
      where: { id: req.params.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user is admin or the application owner
    if (req.user.role !== 'admin' &&
        (!application.userId || application.userId !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    logger.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application'
    });
  }
};

// @desc    Update application status (Admin only)
// @route   PUT /api/admissions/applications/:id/status
// @access  Private/Admin
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;

    const application = await prisma.admissionApplication.findUnique({
      where: { id: req.params.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const updated = await prisma.admissionApplication.update({
      where: { id: req.params.id },
      data: {
        applicationStatus: status,
        remarks: reviewNotes || application.remarks
      }
    });

    auditLog({
      action: 'UPDATE_APPLICATION_STATUS', category: 'ADMISSION',
      performedBy: req.user.id, performedByRole: req.user.role,
      targetModel: 'AdmissionApplication', targetId: application.id,
      description: `Changed application ${application.applicationNumber} (${application.fullName}) status from "${application.applicationStatus}" to "${status}"`,
      previousValue: { status: application.applicationStatus },
      newValue: { status },
    });

    // Send response immediately to user
    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: updated
    });

    // Send email based on status change (non-blocking)
    if (status === 'Under Review') {
      sendApplicationUnderReviewEmail(
        application.email,
        application.fullName,
        application.applicationNumber,
        reviewNotes
      ).catch(emailError => {
        logger.error('Email sending failed (non-blocking):', emailError);
      });
    } else if (status === 'Accepted') {
      sendApplicationAcceptanceEmail(
        application.email,
        application.fullName,
        application.applicationNumber,
        application.program
      ).catch(emailError => {
        logger.error('Email sending failed (non-blocking):', emailError);
      });
    } else if (status === 'Rejected') {
      sendApplicationRejectionEmail(
        application.email,
        application.fullName,
        application.applicationNumber,
        reviewNotes
      ).catch(emailError => {
        logger.error('Email sending failed (non-blocking):', emailError);
      });
    }
  } catch (error) {
    logger.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application status'
    });
  }
};

// @desc    Get application statistics (Admin only)
// @route   GET /api/admissions/statistics
// @access  Private/Admin
export const getApplicationStatistics = async (req, res) => {
  try {
    const totalApplications = await prisma.admissionApplication.count();
    const pendingApplications = await prisma.admissionApplication.count({ where: { applicationStatus: 'Pending' } });
    const underReviewApplications = await prisma.admissionApplication.count({ where: { applicationStatus: 'Under Review' } });
    const acceptedApplications = await prisma.admissionApplication.count({ where: { applicationStatus: 'Accepted' } });
    const rejectedApplications = await prisma.admissionApplication.count({ where: { applicationStatus: 'Rejected' } });
    const waitlistedApplications = await prisma.admissionApplication.count({ where: { applicationStatus: 'Waitlisted' } });

    res.status(200).json({
      success: true,
      data: {
        total: totalApplications,
        pending: pendingApplications,
        underReview: underReviewApplications,
        accepted: acceptedApplications,
        rejected: rejectedApplications,
        waitlisted: waitlistedApplications
      }
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

// @desc    Upload documents for an application
// @route   POST /api/admissions/applications/:id/documents
// @access  Private (Applicant or Admin)
export const uploadDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;

    logger.info(`[Upload Documents] Processing upload for application: ${id}`);
    logger.info(`[Upload Documents] Files received: ${req.files ? req.files.length : 0}`);
    if (req.files && req.files.length > 0) {
      logger.info(`[Upload Documents] Files details:`, req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size })));
    }

    // Parse file metadata from request body
    let fileMetadata = [];
    if (req.body.fileMetadata) {
      try {
        fileMetadata = JSON.parse(req.body.fileMetadata);
        logger.info(`[Upload Documents] File metadata:`, fileMetadata);
      } catch (error) {
        logger.error('[Upload Documents] Error parsing file metadata:', error);
      }
    }

    // Find application
    const application = await prisma.admissionApplication.findUnique({
      where: { id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization
    if (req.user && req.user.role !== 'admin' &&
        application.userId && application.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload documents for this application'
      });
    }

    // Validate files were uploaded
    if (!req.files || req.files.length === 0) {
      logger.warn(`[Upload Documents] No files found in request for application ${id}`);
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Check file count limit
    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 files can be uploaded at once'
      });
    }

    // Create a map of filename to field type from metadata
    const fileMetadataMap = new Map(fileMetadata.map(f => [f.fileName, f.fieldType]));

    // Upload all files to Supabase (admission-documents bucket, organized by application ID)
    const uploadResults = await Promise.all(req.files.map(async (file) => {
      const { publicUrl } = await uploadToBucket(
        'admission-documents',
        file.buffer,
        file.originalname,
        file.mimetype,
        id
      );
      const fieldType = fileMetadataMap.get(file.originalname);
      return { file, publicUrl, fieldType };
    }));

    // Map results to their respective schema fields
    uploadResults.forEach(({ file, publicUrl, fieldType }) => {
      logger.info(`[Upload Documents] Processing file: "${file.originalname}"`);
      logger.info(`[Upload Documents] Looking for metadata with fileName: "${file.originalname}"`);
      logger.info(`[Upload Documents] Found fieldType: "${fieldType}"`);
      logger.info(`[Upload Documents] File URL: ${publicUrl}`);

      if (!fieldType) {
        logger.warn(`[Upload Documents] WARNING: No metadata found for file "${file.originalname}". Will store in documents array only.`);
      }

      if (fieldType === 'cnic_front') {
        application.cnicFront = publicUrl;
        logger.info('[Upload Documents] ✓ Updated cnicFront');
      } else if (fieldType === 'cnic_back') {
        application.cnicBack = publicUrl;
        logger.info('[Upload Documents] ✓ Updated cnicBack');
      } else if (fieldType === 'domicile') {
        if (!application.address) application.address = {};
        application.address.domicileUpload = publicUrl;
        logger.info('[Upload Documents] ✓ Updated address.domicileUpload');
      } else if (fieldType === 'guardian_cnic') {
        if (!application.guardian) application.guardian = {};
        application.guardian.cnicUpload = publicUrl;
        logger.info('[Upload Documents] ✓ Updated guardian.cnicUpload');
      } else if (fieldType && fieldType.startsWith('transcript_')) {
        const index = parseInt(fieldType.split('_')[1]);
        if (application.educationRecords && application.educationRecords[index]) {
          application.educationRecords[index].transcript = publicUrl;
          logger.info(`[Upload Documents] ✓ Updated educationRecords[${index}].transcript`);
        } else {
          logger.warn(`[Upload Documents] WARNING: educationRecords[${index}] does not exist`);
        }
      }
    });

    // Add documents to application (for general tracking)
    const uploadedDocuments = uploadResults.map(({ file, publicUrl, fieldType }) => ({
      type: fieldType || file.fieldname,
      fileName: file.originalname,
      url: publicUrl,
      uploadedAt: new Date()
    }));

    if (!application.documents) {
      application.documents = [];
    }
    application.documents.push(...uploadedDocuments);

    // Save updated application
    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: {
        cnicFront: application.cnicFront,
        cnicBack: application.cnicBack,
        address: application.address,
        guardian: application.guardian,
        educationRecords: application.educationRecords,
        documents: application.documents
      }
    });

    logger.info(`[Upload Documents] Successfully uploaded ${uploadedDocuments.length} files for application ${id}`);

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        documents: uploadedDocuments,
        totalDocuments: application.documents.length,
        applicationData: {
          cnicFront: application.cnicFront,
          cnicBack: application.cnicBack,
          'address.domicileUpload': application.address?.domicileUpload,
          'guardian.cnicUpload': application.guardian?.cnicUpload
        }
      }
    });
  } catch (error) {
    logger.error('Error uploading documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading documents',
      error: error.message
    });
  }
};

// @desc    Delete a document from an application
// @route   DELETE /api/admissions/applications/:id/documents/:docIndex
// @access  Private (Applicant or Admin)
export const deleteDocument = async (req, res) => {
  try {
    const { id, docIndex } = req.params;

    // Find application
    const application = await prisma.admissionApplication.findUnique({
      where: { id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization
    if (req.user && req.user.role !== 'admin' &&
        application.userId && application.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete documents from this application'
      });
    }

    // Validate document index
    const docIdx = parseInt(docIndex);
    if (docIdx < 0 || docIdx >= application.documents.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document index'
      });
    }

    // Delete file from disk
    const document = application.documents[docIdx];
    deleteFile(document.fileName);

    // Remove document from array
    application.documents.splice(docIdx, 1);

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: { documents: application.documents }
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message
    });
  }
};

// @desc    Get documents for an application
// @route   GET /api/admissions/applications/:id/documents
// @access  Private (Applicant or Admin)
export const getApplicationDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    // Find application
    const application = await prisma.admissionApplication.findUnique({
      where: { id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization
    if (req.user && req.user.role !== 'admin' &&
        application.userId && application.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view documents for this application'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        applicationId: id,
        documents: application.documents || [],
        totalDocuments: application.documents ? application.documents.length : 0
      }
    });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents'
    });
  }
};

// @desc    Check if email is already registered
// @route   GET /api/admissions/check-email/:email
// @access  Public
export const checkDuplicateEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const existingEmail = await prisma.admissionApplication.findFirst({
      where: { email: email.toLowerCase() }
    });

    res.status(200).json({
      success: true,
      exists: !!existingEmail,
      message: existingEmail ? 'This email has already submitted an application' : 'Email is available'
    });
  } catch (error) {
    logger.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email'
    });
  }
};

// @desc    Check if CNIC is already registered
// @route   GET /api/admissions/check-cnic/:cnic
// @access  Public
export const checkDuplicateCNIC = async (req, res) => {
  try {
    const { cnic } = req.params;

    const existingCNIC = await prisma.admissionApplication.findFirst({
      where: { cnic }
    });

    res.status(200).json({
      success: true,
      exists: !!existingCNIC,
      message: existingCNIC ? 'This CNIC has already submitted an application' : 'CNIC is available'
    });
  } catch (error) {
    logger.error('Error checking CNIC:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking CNIC'
    });
  }
};

// @desc    Check if phone is already registered
// @route   GET /api/admissions/check-phone/:phone
// @access  Public
export const checkDuplicatePhone = async (req, res) => {
  try {
    const { phone } = req.params;

    const existingPhone = await prisma.admissionApplication.findFirst({
      where: { phone }
    });

    res.status(200).json({
      success: true,
      exists: !!existingPhone,
      message: existingPhone ? 'This phone number has already submitted an application' : 'Phone is available'
    });
  } catch (error) {
    logger.error('Error checking phone:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking phone'
    });
  }
};

// @desc    Search applications
// @route   GET /api/admissions/search
// @access  Private/Admin
export const searchApplications = async (req, res) => {
  try {
    const { query, status } = req.query;

    const where = {
      ...(status && { status })
    };

    if (query) {
      where.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { cnic: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { applicationNumber: { contains: query, mode: 'insensitive' } }
      ];
    }

    const results = await prisma.admissionApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 50
    });

    res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    logger.error('Error searching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching applications'
    });
  }
};
