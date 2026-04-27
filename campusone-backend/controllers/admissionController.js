import prisma from '../prisma/client.js';
import { deleteFile, getFileUrl } from '../middleware/uploadMiddleware.js';
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
    let settings = await prisma.admissionSettings.findFirst();
    if (!settings) {
      settings = await prisma.admissionSettings.create({
        data: {
          isOpen: true,
          instructions: 'Please fill all required fields',
          requiresDocuments: true,
          requiredDocuments: ['cnic_front', 'cnic_back', 'transcript']
        }
      });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching admission settings:', error);
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

    res.status(200).json({ success: true, message: 'Admission settings updated successfully', data: settings });
  } catch (error) {
    console.error('Error updating admission settings:', error);
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
        status: 'Pending',
        submittedAt: new Date(),
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
      console.error('Email sending failed (non-blocking):', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        _id: application.id,
        applicationNumber: application.applicationNumber,
        status: application.status
      }
    });
  } catch (error) {
    console.error('Error submitting application:', error);
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
      where.status = status;
    }

    const applications = await prisma.admissionApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
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
    console.error('Error fetching applications:', error);
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
    console.error('Error fetching application:', error);
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

    const previousStatus = application.status;

    const updated = await prisma.admissionApplication.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        reviewNotes: reviewNotes || application.reviewNotes
      }
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
        console.error('Email sending failed (non-blocking):', emailError);
      });
    } else if (status === 'Accepted') {
      sendApplicationAcceptanceEmail(
        application.email,
        application.fullName,
        application.applicationNumber,
        application.program
      ).catch(emailError => {
        console.error('Email sending failed (non-blocking):', emailError);
      });
    } else if (status === 'Rejected') {
      sendApplicationRejectionEmail(
        application.email,
        application.fullName,
        application.applicationNumber,
        reviewNotes
      ).catch(emailError => {
        console.error('Email sending failed (non-blocking):', emailError);
      });
    }
  } catch (error) {
    console.error('Error updating application status:', error);
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
    const pendingApplications = await prisma.admissionApplication.count({ where: { status: 'Pending' } });
    const underReviewApplications = await prisma.admissionApplication.count({ where: { status: 'Under Review' } });
    const acceptedApplications = await prisma.admissionApplication.count({ where: { status: 'Accepted' } });
    const rejectedApplications = await prisma.admissionApplication.count({ where: { status: 'Rejected' } });
    const waitlistedApplications = await prisma.admissionApplication.count({ where: { status: 'Waitlisted' } });

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
    console.error('Error fetching statistics:', error);
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

    console.log(`[Upload Documents] Processing upload for application: ${id}`);
    console.log(`[Upload Documents] Files received: ${req.files ? req.files.length : 0}`);
    if (req.files && req.files.length > 0) {
      console.log(`[Upload Documents] Files details:`, req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size })));
    }

    // Parse file metadata from request body
    let fileMetadata = [];
    if (req.body.fileMetadata) {
      try {
        fileMetadata = JSON.parse(req.body.fileMetadata);
        console.log(`[Upload Documents] File metadata:`, fileMetadata);
      } catch (error) {
        console.error('[Upload Documents] Error parsing file metadata:', error);
      }
    }

    // Find application
    const application = await prisma.admissionApplication.findUnique({
      where: { id }
    });

    if (!application) {
      if (req.files) {
        req.files.forEach(file => deleteFile(file.filename));
      }
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization
    if (req.user && req.user.role !== 'admin' &&
        application.userId && application.userId !== req.user.id) {
      if (req.files) {
        req.files.forEach(file => deleteFile(file.filename));
      }
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload documents for this application'
      });
    }

    // Validate files were uploaded
    if (!req.files || req.files.length === 0) {
      console.warn(`[Upload Documents] No files found in request for application ${id}`);
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Check file count limit
    if (req.files.length > 5) {
      req.files.forEach(file => deleteFile(file.filename));
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 files can be uploaded at once'
      });
    }

    // Create a map of filename to field type from metadata
    const fileMetadataMap = new Map(fileMetadata.map(f => [f.fileName, f.fieldType]));

    // Map uploaded files to their respective schema fields based on metadata
    req.files.forEach((file) => {
      const fieldType = fileMetadataMap.get(file.originalname);
      const fileUrl = getFileUrl(file.filename);

      console.log(`[Upload Documents] Processing file: "${file.originalname}"`);
      console.log(`[Upload Documents] Looking for metadata with fileName: "${file.originalname}"`);
      console.log(`[Upload Documents] Found fieldType: "${fieldType}"`);
      console.log(`[Upload Documents] File URL: ${fileUrl}`);

      if (!fieldType) {
        console.warn(`[Upload Documents] WARNING: No metadata found for file "${file.originalname}". Will store in documents array only.`);
      }

      if (fieldType === 'cnic_front') {
        application.cnicFront = fileUrl;
        console.log('[Upload Documents] ✓ Updated cnicFront');
      } else if (fieldType === 'cnic_back') {
        application.cnicBack = fileUrl;
        console.log('[Upload Documents] ✓ Updated cnicBack');
      } else if (fieldType === 'domicile') {
        if (!application.address) application.address = {};
        application.address.domicileUpload = fileUrl;
        console.log('[Upload Documents] ✓ Updated address.domicileUpload');
      } else if (fieldType === 'guardian_cnic') {
        if (!application.guardian) application.guardian = {};
        application.guardian.cnicUpload = fileUrl;
        console.log('[Upload Documents] ✓ Updated guardian.cnicUpload');
      } else if (fieldType && fieldType.startsWith('transcript_')) {
        const index = parseInt(fieldType.split('_')[1]);
        if (application.educationRecords && application.educationRecords[index]) {
          application.educationRecords[index].transcript = fileUrl;
          console.log(`[Upload Documents] ✓ Updated educationRecords[${index}].transcript`);
        } else {
          console.warn(`[Upload Documents] WARNING: educationRecords[${index}] does not exist`);
        }
      }
    });

    // Add documents to application (for general tracking)
    const uploadedDocuments = req.files.map(file => {
      const fieldType = fileMetadataMap.get(file.originalname) || file.fieldname;
      return {
        type: fieldType,
        fileName: file.filename,
        url: getFileUrl(file.filename),
        uploadedAt: new Date()
      };
    });

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

    console.log(`[Upload Documents] Successfully uploaded ${uploadedDocuments.length} files for application ${id}`);

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
    if (req.files) {
      req.files.forEach(file => deleteFile(file.filename));
    }
    console.error('Error uploading documents:', error);
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
    console.error('Error deleting document:', error);
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
    console.error('Error fetching documents:', error);
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
    console.error('Error checking email:', error);
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
    console.error('Error checking CNIC:', error);
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
    console.error('Error checking phone:', error);
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
    console.error('Error searching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching applications'
    });
  }
};
