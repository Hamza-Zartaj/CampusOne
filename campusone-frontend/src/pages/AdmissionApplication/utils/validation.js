import { FILE_CONFIG } from './constants';
import toast from 'react-hot-toast';

// Validate file uploads
export const validateFile = (file) => {
  if (!file) return { valid: true };

  if (!FILE_CONFIG.allowedTypes.includes(file.type)) {
    toast.error('Only PDF, JPG, and PNG files are allowed');
    return { valid: false, error: 'Invalid file type' };
  }

  if (file.size > FILE_CONFIG.maxSize) {
    toast.error('File size must be less than 5MB');
    return { valid: false, error: 'File too large' };
  }

  return { valid: true };
};

// Validate step by step
export const validateStep = (step, formData) => {
  switch (step) {
    case 0: // Personal Information
      if (!formData.fullName || !formData.email || !formData.phone || !formData.cnic || !formData.dateOfBirth) {
        toast.error('Please fill in all required personal information fields');
        return false;
      }
      return true;

    case 1: // Father/Guardian Information - optional, always valid
      return true;

    case 2: // Previous Education
      if (formData.educationRecords.length === 0) {
        toast.error('Please add at least one education record');
        return false;
      }
      return true;

    case 3: // Address & Nationality
      if (formData.address.nationality === 'Pakistani' && !formData.address.domicileUpload) {
        toast.error('Domicile upload is required for Pakistani nationals');
        return false;
      }
      return true;

    case 4: // Program Selection
      if (!formData.program) {
        toast.error('Please select a program');
        return false;
      }
      return true;

    case 5: // Personal Statement - optional, always valid
      return true;

    case 6: // Review & Submit
      return true;

    default:
      return true;
  }
};

// Validate education record
export const validateEducationRecord = (education) => {
  const errors = {};

  if (!education.level) {
    errors.level = 'Education level is required';
  }
  if (!education.degreeName) {
    errors.degreeName = 'Degree/Program name is required';
  }
  if (!education.institution) {
    errors.institution = 'Institution name is required';
  }
  if (!education.board) {
    errors.board = 'Board/University is required';
  }
  if (!education.completionYear) {
    errors.completionYear = 'Completion year is required';
  }
  if (!education.resultType) {
    errors.resultType = 'Result type is required';
  }
  if (!education.result) {
    errors.result = 'Result is required';
  }
  if (!education.transcript) {
    errors.transcript = 'Transcript upload is required';
  }

  return errors;
};

// Validate complete application before submission
export const validateCompleteApplication = (formData) => {
  const errors = [];

  if (!formData.fullName || !formData.email || !formData.phone || !formData.cnic || !formData.dateOfBirth) {
    errors.push('Personal information is incomplete');
  }

  if (formData.educationRecords.length === 0) {
    errors.push('Please add at least one education record');
  }

  if (formData.address.nationality === 'Pakistani' && !formData.address.domicileUpload) {
    errors.push('Domicile upload is required for Pakistani nationals');
  }

  if (!formData.program) {
    errors.push('Please select a program');
  }

  return errors;
};
