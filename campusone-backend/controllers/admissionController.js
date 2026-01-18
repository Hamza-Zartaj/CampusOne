import AdmissionSettings from '../models/AdmissionSettings.js';
import AdmissionApplication from '../models/AdmissionApplication.js';

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
    
    // TODO: Send notification emails if configured
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
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
