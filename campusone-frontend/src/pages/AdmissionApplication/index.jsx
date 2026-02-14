import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { admissionAPI } from '../../utils/api';

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
  FatherGuardianInfo,
  PreviousEducation,
  AddressNationality,
  ProgramSelection,
  PersonalStatement,
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
  const {
    currentEducation,
    setCurrentEducation,
    editingIndex,
    setEditingIndex,
    educationErrors,
    handleEducationChange,
    handleEducationFileChange,
    addEducation,
    editEducation,
    deleteEducation,
    cancelEditEducation,
    resetEducationForm
  } = useEducationRecords(
    (records) => setFormData(prev => ({ ...prev, educationRecords: records })),
    (records) => setFormData(prev => ({ ...prev, educationRecords: records })),
    (records) => setFormData(prev => ({ ...prev, educationRecords: records }))
  );

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
      console.error('Error fetching programs:', error);
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
        navigate('/');
        return;
      }

      setSettings(settingsData);
    } catch (error) {
      console.error('Error checking admission status:', error);
      toast.error('Unable to load admission information');
      navigate('/');
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
      const response = await admissionAPI.submitApplication(formData);

      setApplicationNumber(response.data.data.applicationNumber);
      setSubmitted(true);
      toast.success('Application submitted successfully!');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
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
          <FatherGuardianInfo
            formData={formData}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
          />
        );
      case 2:
        return (
          <PreviousEducation
            formData={formData}
            currentEducation={currentEducation}
            educationErrors={educationErrors}
            handleEducationChange={handleEducationChange}
            handleEducationFileChange={handleEducationFileChange}
            onAddEducation={handleEducationAddClick}
            onEditEducation={handleEducationEditClick}
            onDeleteEducation={handleEducationDeleteClick}
            onCancelEdit={cancelEditEducation}
            editingIndex={editingIndex}
          />
        );
      case 3:
        return (
          <AddressNationality
            formData={formData}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
          />
        );
      case 4:
        return (
          <ProgramSelection formData={formData} programs={programs} handleChange={handleChange} />
        );
      case 5:
        return <PersonalStatement formData={formData} handleChange={handleChange} />;
      case 6:
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
