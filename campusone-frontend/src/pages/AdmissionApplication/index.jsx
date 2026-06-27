import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { admissionAPI } from '../../utils/api';
import clientLogger from '../../utils/clientLogger';

// Import custom hooks
import { useAdmissionForm } from './hooks/useAdmissionForm';
import { useEducationRecords } from './hooks/useEducationRecords';
import { useStepNavigation } from './hooks/useStepNavigation';

// Import components
import {
  Header,
  StepIndicator,
  NavigationButtons,
  SuccessMessage,
  LoadingSpinner
} from './components';

// Import sections
import {
  PersonalInformation,
  GuardianInfo,
  PreviousEducation,
  Address,
  ProgramSelection,
  ReviewSubmit
} from './sections';

// Import utils
import { STEPS, MOCK_PROGRAMS } from './utils/constants';
import { validateStep, validateCompleteApplication } from './utils/validation';

/**
 * Main AdmissionApplication Component
 * Multi-step form for student admission applications with comprehensive validation
 */
const AdmissionApplication = () => {
  const navigate = useNavigate();

  // State management
  const [settings, setSettings] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');

  // Custom hooks
  const { formData, setFormData, handleChange, handleFileChange } = useAdmissionForm();

  // Memoize callbacks to maintain stable references and prevent hook rule violations
  const handleEducationAdd = useCallback(
    (records) => setFormData(prev => ({ ...prev, educationRecords: records })),
    []
  );

  const handleEducationUpdate = useCallback(
    (records) => setFormData(prev => ({ ...prev, educationRecords: records })),
    []
  );

  const handleEducationDelete = useCallback(
    (records) => setFormData(prev => ({ ...prev, educationRecords: records })),
    []
  );

  const {
    currentEducation,
    setCurrentEducation,
    editingIndex,
    setEditingIndex,
    educationErrors,
    fileInputKey,
    handleEducationChange,
    handleEducationFileChange,
    addEducation,
    editEducation,
    deleteEducation,
    cancelEditEducation,
    resetEducationForm
  } = useEducationRecords(handleEducationAdd, handleEducationUpdate, handleEducationDelete);

  const {
    currentStep,
    setCurrentStep,
    maxStepReached,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    resetSteps
  } = useStepNavigation(STEPS.length);

  // Effects
  useEffect(() => {
    checkAdmissionStatus();
    fetchPrograms();
  }, []);

  // API Calls
  const fetchPrograms = async () => {
    try {
      setPrograms(MOCK_PROGRAMS);
    } catch (error) {
      clientLogger.error('Error fetching programs', error);
      setPrograms(MOCK_PROGRAMS);
    }
  };

  const checkAdmissionStatus = async () => {
    try {
      setLoading(true);
      const response = await admissionAPI.getSettings();
      const settingsData = response.data.data;

      if (!settingsData.isOpen) {
        toast.error('Admissions are currently closed');
        setLoading(false);
        setTimeout(() => navigate('/'), 1000);
        return;
      }

      setSettings(settingsData);
    } catch (error) {
      clientLogger.error('Error checking admission status', error);
      toast.error('Unable to load admission information');
      setLoading(false);
      setTimeout(() => navigate('/'), 1000);
      return;
    } finally {
      setLoading(false);
    }
  };

  // Form handling
  const handleEducationAddClick = (records) => {
    addEducation(records);
  };

  const handleEducationEditClick = (index, record) => {
    editEducation(index, record);
    const section = document.getElementById('education-form-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleEducationDeleteClick = (index, records) => {
    deleteEducation(index, records);
  };

  // Navigation handlers
  const handleNextStep = () => {
    if (validateStep(currentStep, formData)) {
      goToNextStep(true);
    }
  };

  const handlePreviousStep = () => {
    goToPreviousStep();
  };

  const handleStepClick = (stepIndex) => {
    goToStep(stepIndex);
  };

  // Submit handler
  const handleSubmit = async () => {
    const validationErrors = validateCompleteApplication(formData);

    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      setSubmitting(true);
      
      // Clean form data - remove File objects and set country for Pakistani nationals
      const cleanedFormData = {
        ...formData,
        cnicFront: null,  // Files will be uploaded separately
        cnicBack: null,
        guardian: {
          ...formData.guardian,
          cnicUpload: null  // Files will be uploaded separately
        },
        address: {
          ...formData.address,
          country: formData.address.nationality === 'Pakistani' ? 'Pakistan' : formData.address.country,
          domicileUpload: null  // Files will be uploaded separately
        },
        educationRecords: formData.educationRecords.map(edu => ({
          ...edu,
          transcript: null  // Files will be uploaded separately
        }))
      };

      const response = await admissionAPI.submitApplication(cleanedFormData);
      
      const applicationId = response.data.data.applicationId || response.data.data.id;
      const appNumber = response.data.data.applicationNumber;
      setApplicationNumber(appNumber);

      // Upload files after application is created
      if (applicationId) {
        await uploadApplicationFiles(applicationId);
      }

      setSubmitted(true);
      toast.success('Application submitted successfully!');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      clientLogger.error('Error submitting application', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload files to application
  const uploadApplicationFiles = async (applicationId) => {
    const filesToUpload = [];

    clientLogger.debug('[File Upload] Starting file collection');
    clientLogger.debug('[File Upload] formData.cnicFront', formData.cnicFront);
    clientLogger.debug('[File Upload] formData.cnicBack', formData.cnicBack);
    clientLogger.debug('[File Upload] formData.address?.domicileUpload', formData.address?.domicileUpload);
    clientLogger.debug('[File Upload] formData.guardian?.cnicUpload', formData.guardian?.cnicUpload);
    clientLogger.debug('[File Upload] formData.educationRecords', formData.educationRecords);

    // Collect all files from form data
    if (formData.cnicFront) {
      clientLogger.debug('[File Upload] Adding cnicFront', formData.cnicFront.name);
      filesToUpload.push({ file: formData.cnicFront, type: 'cnic_front' });
    } else {
      clientLogger.debug('[File Upload] cnicFront is missing/null');
    }

    if (formData.cnicBack) {
      clientLogger.debug('[File Upload] Adding cnicBack', formData.cnicBack.name);
      filesToUpload.push({ file: formData.cnicBack, type: 'cnic_back' });
    } else {
      clientLogger.debug('[File Upload] cnicBack is missing/null');
    }

    if (formData.address?.domicileUpload) {
      clientLogger.debug('[File Upload] Adding domicileUpload', formData.address.domicileUpload.name);
      filesToUpload.push({ file: formData.address.domicileUpload, type: 'domicile' });
    } else {
      clientLogger.debug('[File Upload] domicileUpload is missing/null');
    }

    if (formData.guardian?.cnicUpload) {
      clientLogger.debug('[File Upload] Adding guardian.cnicUpload', formData.guardian.cnicUpload.name);
      filesToUpload.push({ file: formData.guardian.cnicUpload, type: 'guardian_cnic' });
    } else {
      clientLogger.debug('[File Upload] guardian.cnicUpload is missing/null');
    }
    
    // Collect transcripts from education records
    formData.educationRecords.forEach((edu, index) => {
      if (edu.transcript) {
        clientLogger.debug(`[File Upload] Adding educationRecords[${index}].transcript`, edu.transcript.name);
        filesToUpload.push({ file: edu.transcript, type: `transcript_${index}` });
      } else {
        clientLogger.debug(`[File Upload] educationRecords[${index}].transcript is missing/null`);
      }
    });

    clientLogger.debug(`[File Upload] Total files to upload: ${filesToUpload.length}`);

    if (filesToUpload.length === 0) {
      clientLogger.debug('No files to upload');
      return; // No files to upload
    }

    try {
      const formDataToSend = new FormData();
      const fileMetadata = [];
      
      // Append each file to the 'documents' field and track metadata
      filesToUpload.forEach(({ file, type }) => {
        clientLogger.debug(`[File Upload] Appending file: "${file.name}" with type: "${type}"`);
        formDataToSend.append('documents', file, file.name);
        fileMetadata.push({
          fileName: file.name,
          fieldType: type  // cnic_front, cnic_back, domicile, guardian_cnic, transcript_0, etc.
        });
      });

      // Send file metadata to backend so it knows which field each file belongs to
      clientLogger.debug('[File Upload] Metadata being sent', fileMetadata);
      formDataToSend.append('fileMetadata', JSON.stringify(fileMetadata));

      // Debug: Log FormData entries
      clientLogger.debug('FormData entries');
      for (let pair of formDataToSend.entries()) {
        if (pair[0] !== 'documents') {
          clientLogger.debug(`  ${pair[0]}:`, pair[1]);
        }
      }
      clientLogger.debug(`  documents: ${filesToUpload.length} file(s)`);

      clientLogger.debug(`Uploading ${filesToUpload.length} file(s) to application ${applicationId}`);
      
      const response = await admissionAPI.uploadApplicationDocuments(applicationId, formDataToSend);
      
      if (response.data.success) {
        toast.success(`Uploaded ${filesToUpload.length} file(s) successfully!`);
      }
    } catch (error) {
      clientLogger.error('Error uploading files', error);
      clientLogger.error('Error upload response data', error.response?.data);
      toast.error('Some files could not be uploaded. You can upload them later.');
    }
  };

  // Render states
  if (loading) {
    return <LoadingSpinner message="Loading admission form..." />;
  }

  if (submitted) {
    return (
      <SuccessMessage
        applicationNumber={applicationNumber}
        email={formData.email}
        onHomeClick={() => navigate('/')}
      />
    );
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PersonalInformation
            formData={formData}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
          />
        );
      case 1:
        return (
          <GuardianInfo
            formData={formData}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
          />
        );
      case 2:
        return (
          <Address
            formData={formData}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
          />
        );
      case 3:
        return (
          <PreviousEducation
            formData={formData}
            currentEducation={currentEducation}
            educationErrors={educationErrors}
            fileInputKey={fileInputKey}
            handleEducationChange={handleEducationChange}
            handleEducationFileChange={handleEducationFileChange}
            onAddEducation={handleEducationAddClick}
            onEditEducation={handleEducationEditClick}
            onDeleteEducation={handleEducationDeleteClick}
            onCancelEdit={cancelEditEducation}
            editingIndex={editingIndex}
          />
        );
      case 4:
        return (
          <ProgramSelection formData={formData} programs={programs} handleChange={handleChange} />
        );
      case 5:
        return <ReviewSubmit formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-300 mx-auto p-8 max-md:p-4">
      {/* Header */}
      <Header instructions={settings?.instructions} onBackClick={() => navigate('/')} />

      {/* Step Indicator */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        maxStepReached={maxStepReached}
        onStepClick={handleStepClick}
      />

      {/* Form Container */}
      <div className="bg-white rounded-xl p-8 shadow-md max-md:p-6">
        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <NavigationButtons
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === STEPS.length - 1}
          onPreviousClick={handlePreviousStep}
          onNextClick={handleNextStep}
          onSubmitClick={handleSubmit}
          isSubmitting={submitting}
        />
      </div>
    </div>
  );
};

export default AdmissionApplication;
