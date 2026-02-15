import AdmissionSettings from '../models/AdmissionSettings.js';
import AdmissionApplication from '../models/AdmissionApplication.js';
import { deleteFile, getFileUrl } from '../middleware/uploadMiddleware.js';
import { sendAdmissionApplicationConfirmationEmail } from '../services/emailService.js';

// @desc    Get admission settings
// @route   GET /api/admissions/settings
// @access  Public
export const getAdmissionSettings = async (req, res) => {
  try {
    const settings = await AdmissionSettings.getSettings();
    
    // Return public info including whether admissions are currently open
    res.status(200).json({
      success: true,
      data: {
        isOpen: settings.isCurrentlyOpen(),
        startDate: settings.startDate,
        endDate: settings.endDate,
        instructions: settings.instructions,
        requiresDocuments: settings.requiresDocuments,
        requiredDocuments: settings.requiredDocuments,
        applicationFormFields: settings.applicationFormFields
      }
    });
  } catch (error) {
    console.error('Error fetching admission settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admission settings'
    });
  }
};

// @desc    Update admission settings (Admin only)
// @route   PUT /api/admissions/settings
// @access  Private/Admin
export const updateAdmissionSettings = async (req, res) => {
  try {
    const settings = await AdmissionSettings.getSettings();
    
    // Update fields if provided
    const allowedFields = [
      'isOpen',
      'startDate',
      'endDate',
      'instructions',
      'maxApplications',
      'requiresDocuments',
      'requiredDocuments',
      'notificationEmails',
      'applicationFormFields'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Admission settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating admission settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admission settings'
    });
  }
};

// @desc    Submit admission application
// @route   POST /api/admissions/apply
// @access  Public
export const submitApplication = async (req, res) => {
  try {
    // Check if admissions are open
    const settings = await AdmissionSettings.getSettings();
    
    if (!settings.isCurrentlyOpen()) {
      return res.status(400).json({
        success: false,
        message: 'Admissions are currently closed'
      });
    }
    
    // Check if max applications reached
    if (settings.maxApplications) {
      const applicationCount = await AdmissionApplication.countDocuments();
      if (applicationCount >= settings.maxApplications) {
        return res.status(400).json({
          success: false,
          message: 'Maximum number of applications has been reached'
        });
      }
    }
    
    // Check if email already applied
    const existingApplication = await AdmissionApplication.findOne({ email: req.body.email });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'An application with this email already exists'
      });
    }
    
    // Create application
    const application = await AdmissionApplication.create({
      ...req.body,
      userId: req.user ? req.user.id : null
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
      // Continue even if email fails - application is already created
    }
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        _id: application._id,
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
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const applications = await AdmissionApplication.find(query)
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('reviewedBy', 'name email');
    
    const count = await AdmissionApplication.countDocuments(query);
    
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
    const application = await AdmissionApplication.findById(req.params.id)
      .populate('reviewedBy', 'name email');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check if user is admin or the application owner
    if (req.user.role !== 'admin' && 
        (!application.userId || application.userId.toString() !== req.user.id)) {
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
    
    const application = await AdmissionApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    application.status = status;
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    
    if (reviewNotes) {
      application.reviewNotes = reviewNotes;
    }
    
    await application.save();
    
    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
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
    const totalApplications = await AdmissionApplication.countDocuments();
    const pendingApplications = await AdmissionApplication.countDocuments({ status: 'Pending' });
    const underReviewApplications = await AdmissionApplication.countDocuments({ status: 'Under Review' });
    const acceptedApplications = await AdmissionApplication.countDocuments({ status: 'Accepted' });
    const rejectedApplications = await AdmissionApplication.countDocuments({ status: 'Rejected' });
    const waitlistedApplications = await AdmissionApplication.countDocuments({ status: 'Waitlisted' });
    
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
    const application = await AdmissionApplication.findById(id);
    if (!application) {
      // Clean up uploaded files if application not found
      if (req.files) {
        req.files.forEach(file => deleteFile(file.filename));
      }
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization - allow if user is admin OR no authentication required for newly submitted applications
    if (req.user && req.user.role !== 'admin' && 
        application.userId && application.userId.toString() !== req.user.id) {
      // Clean up uploaded files
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
      
      console.log(`[Upload Documents] Mapping file "${file.originalname}" (type: ${fieldType}) to URL: ${fileUrl}`);
      
      if (fieldType === 'cnic_front') {
        application.cnicFront = fileUrl;
        console.log('[Upload Documents] Updated cnicFront');
      } else if (fieldType === 'cnic_back') {
        application.cnicBack = fileUrl;
        console.log('[Upload Documents] Updated cnicBack');
      } else if (fieldType === 'domicile') {
        application.address.domicileUpload = fileUrl;
        console.log('[Upload Documents] Updated address.domicileUpload');
      } else if (fieldType === 'guardian_cnic') {
        application.guardian.cnicUpload = fileUrl;
        console.log('[Upload Documents] Updated guardian.cnicUpload');
      } else if (fieldType && fieldType.startsWith('transcript_')) {
        // Extract education record index from fieldType (e.g., 'transcript_0' -> 0)
        const index = parseInt(fieldType.split('_')[1]);
        if (application.educationRecords[index]) {
          application.educationRecords[index].transcript = fileUrl;
          console.log(`[Upload Documents] Updated educationRecords[${index}].transcript`);
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

    application.documents.push(...uploadedDocuments);
    await application.save();

    console.log(`[Upload Documents] Successfully uploaded ${uploadedDocuments.length} files for application ${id}`);
    console.log('[Upload Documents] Updated application fields:');
    console.log('  - cnicFront:', application.cnicFront ? 'SET' : 'null');
    console.log('  - cnicBack:', application.cnicBack ? 'SET' : 'null');
    console.log('  - address.domicileUpload:', application.address.domicileUpload ? 'SET' : 'null');
    console.log('  - guardian.cnicUpload:', application.guardian.cnicUpload ? 'SET' : 'null');
    application.educationRecords.forEach((edu, idx) => {
      console.log(`  - educationRecords[${idx}].transcript:`, edu.transcript ? 'SET' : 'null');
    });

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        documents: uploadedDocuments,
        totalDocuments: application.documents.length,
        applicationData: {
          cnicFront: application.cnicFront,
          cnicBack: application.cnicBack,
          'address.domicileUpload': application.address.domicileUpload,
          'guardian.cnicUpload': application.guardian.cnicUpload
        }
      }
    });
  } catch (error) {
    // Clean up uploaded files on error
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
    const application = await AdmissionApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization - allow if user is admin OR no authentication required for newly submitted applications
    if (req.user && req.user.role !== 'admin' && 
        application.userId && application.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete documents from this application'
      });
    }

    // Validate document index
    if (docIndex < 0 || docIndex >= application.documents.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document index'
      });
    }

    // Delete file from disk
    const document = application.documents[docIndex];
    deleteFile(document.fileName);

    // Remove document from array
    application.documents.splice(docIndex, 1);
    await application.save();

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
    const application = await AdmissionApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization - allow if user is admin OR no authentication required for newly submitted applications
    if (req.user && req.user.role !== 'admin' && 
        application.userId && application.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view documents for this application'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        applicationId: id,
        documents: application.documents,
        totalDocuments: application.documents.length
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message
    });
  }
};
