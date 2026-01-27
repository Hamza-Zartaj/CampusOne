import AcademicTerm from '../models/AcademicTerm.js';

/**
 * @desc    Create a new academic term
 * @route   POST /api/academic-terms
 * @access  Admin, SuperAdmin
 */
export const createAcademicTerm = async (req, res) => {
  try {
    const { termType, year, name, startDate, endDate, registrationStartDate, registrationEndDate, addDropDeadline, withdrawalDeadline, isCurrent } = req.body;

    // Check if term already exists for this type and year
    const existing = await AcademicTerm.findOne({ termType, year });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${termType} ${year} term already exists`
      });
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // If setting as current, unset all others
    if (isCurrent) {
      await AcademicTerm.updateMany({}, { isCurrent: false });
    }

    const term = await AcademicTerm.create({
      termType,
      year,
      name,
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
      addDropDeadline,
      withdrawalDeadline,
      isCurrent: isCurrent || false
    });

    res.status(201).json({
      success: true,
      message: 'Academic term created successfully',
      data: term
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating academic term',
      error: error.message
    });
  }
};

/**
 * @desc    Get all academic terms
 * @route   GET /api/academic-terms
 * @access  All authenticated users
 */
export const getAcademicTerms = async (req, res) => {
  try {
    const { termType, year, isCurrent, isActive } = req.query;
    
    const filter = {};
    if (termType) filter.termType = termType;
    if (year) filter.year = parseInt(year);
    if (isCurrent !== undefined) filter.isCurrent = isCurrent === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const terms = await AcademicTerm.find(filter).sort({ year: -1, termType: 1 });

    res.status(200).json({
      success: true,
      count: terms.length,
      data: terms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching academic terms',
      error: error.message
    });
  }
};

/**
 * @desc    Get current academic term
 * @route   GET /api/academic-terms/current
 * @access  All authenticated users
 */
export const getCurrentTerm = async (req, res) => {
  try {
    const term = await AcademicTerm.getCurrentTerm();

    if (!term) {
      return res.status(404).json({
        success: false,
        message: 'No current term set'
      });
    }

    res.status(200).json({
      success: true,
      data: term
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching current term',
      error: error.message
    });
  }
};

/**
 * @desc    Get single academic term
 * @route   GET /api/academic-terms/:id
 * @access  All authenticated users
 */
export const getAcademicTerm = async (req, res) => {
  try {
    const term = await AcademicTerm.findById(req.params.id);

    if (!term) {
      return res.status(404).json({
        success: false,
        message: 'Academic term not found'
      });
    }

    res.status(200).json({
      success: true,
      data: term
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching academic term',
      error: error.message
    });
  }
};

/**
 * @desc    Update academic term
 * @route   PUT /api/academic-terms/:id
 * @access  Admin, SuperAdmin
 */
export const updateAcademicTerm = async (req, res) => {
  try {
    const { name, startDate, endDate, registrationStartDate, registrationEndDate, addDropDeadline, withdrawalDeadline, isCurrent, isActive } = req.body;

    const term = await AcademicTerm.findById(req.params.id);
    if (!term) {
      return res.status(404).json({
        success: false,
        message: 'Academic term not found'
      });
    }

    // Validate dates if being updated
    const newStart = startDate ? new Date(startDate) : term.startDate;
    const newEnd = endDate ? new Date(endDate) : term.endDate;
    if (newStart >= newEnd) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // If setting as current, unset all others
    if (isCurrent) {
      await AcademicTerm.updateMany({ _id: { $ne: req.params.id } }, { isCurrent: false });
    }

    const updated = await AcademicTerm.findByIdAndUpdate(
      req.params.id,
      { name, startDate, endDate, registrationStartDate, registrationEndDate, addDropDeadline, withdrawalDeadline, isCurrent, isActive },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Academic term updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating academic term',
      error: error.message
    });
  }
};

/**
 * @desc    Set current academic term
 * @route   PUT /api/academic-terms/:id/set-current
 * @access  Admin, SuperAdmin
 */
export const setCurrentTerm = async (req, res) => {
  try {
    const term = await AcademicTerm.findById(req.params.id);
    if (!term) {
      return res.status(404).json({
        success: false,
        message: 'Academic term not found'
      });
    }

    const updated = await AcademicTerm.setCurrentTerm(req.params.id);

    res.status(200).json({
      success: true,
      message: `${updated.name} set as current term`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting current term',
      error: error.message
    });
  }
};

/**
 * @desc    Delete academic term
 * @route   DELETE /api/academic-terms/:id
 * @access  SuperAdmin
 */
export const deleteAcademicTerm = async (req, res) => {
  try {
    const term = await AcademicTerm.findById(req.params.id);
    if (!term) {
      return res.status(404).json({
        success: false,
        message: 'Academic term not found'
      });
    }

    // Check if term has course offerings
    const CourseOffering = (await import('../models/CourseOffering.js')).default;
    const offeringCount = await CourseOffering.countDocuments({ academicTermId: req.params.id });
    if (offeringCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete term with existing course offerings'
      });
    }

    await AcademicTerm.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Academic term deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting academic term',
      error: error.message
    });
  }
};
