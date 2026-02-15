import { FILE_CONFIG } from './constants';
import toast from 'react-hot-toast';

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate Pakistani phone number
// Accepts formats: +923001234567, 03001234567, 923001234567
export const validatePakistaniPhone = (phone) => {
  // Remove all spaces and hyphens
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Pakistani mobile operators use 300-399 range after country code
  // Landlines use different ranges but we'll focus on mobile
  const pakistaniPhoneRegex = /^(\+92|0|92)?[3][0-9]{2}[0-9]{7}$/;
  
  // Must be between 10-15 characters (accounting for different formats)
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return false;
  }
  
  return pakistaniPhoneRegex.test(cleanPhone);
};

// Validate CNIC format (Pakistani ID: 5 digits - 7 digits - 1 digit)
export const validatePakistaniCNIC = (cnic) => {
  const cleanCNIC = cnic.replace(/[\s\-]/g, '');
  const cnicRegex = /^[0-9]{5}-?[0-9]{7}-?[0-9]{1}$/;
  return cnicRegex.test(cleanCNIC);
};

// Format phone number to standard format
export const formatPakistaniPhone = (phone) => {
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Convert to +92 format if not already
  let formatted = cleanPhone;
  if (formatted.startsWith('0')) {
    formatted = '92' + formatted.substring(1);
  } else if (!formatted.startsWith('92') && !formatted.startsWith('+92')) {
    formatted = '92' + formatted;
  }
  
  // Add + prefix if not present
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  return formatted;
};

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

      // Validate email format
      if (!validateEmail(formData.email)) {
        toast.error('Please enter a valid email address');
        return false;
      }

      // Validate Pakistani phone number
      if (!validatePakistaniPhone(formData.phone)) {
        toast.error('Please enter a valid Pakistani phone number (e.g., +923001234567 or 03001234567)');
        return false;
      }

      // Validate CNIC format
      if (!validatePakistaniCNIC(formData.cnic)) {
        toast.error('Please enter a valid Pakistani CNIC (format: XXXXX-XXXXXXX-X)');
        return false;
      }

      return true;

    case 1: // Guardian Information - optional, but validate if provided
      // Phone number is optional but if provided, must be valid format
      if (formData.guardian.phone && !validatePakistaniPhone(formData.guardian.phone)) {
        toast.error('Please enter a valid Pakistani phone number for guardian (e.g., +923001234567 or 03001234567)');
        return false;
      }

      // CNIC is optional but if provided, must be valid format
      if (formData.guardian.cnic && !validatePakistaniCNIC(formData.guardian.cnic)) {
        toast.error('Please enter a valid Pakistani CNIC for guardian (format: XXXXX-XXXXXXX-X)');
        return false;
      }

      return true;

    case 2: // Address
      if (formData.address.nationality === 'Pakistani' && !formData.address.domicileUpload) {
        toast.error('Domicile upload is required for Pakistani nationals');
        return false;
      }
      return true;

    case 3: // Previous Education
      if (formData.educationRecords.length === 0) {
        toast.error('Please add at least one education record');
        return false;
      }
      return true;

    case 4: // Program Selection
      if (!formData.program) {
        toast.error('Please select a program');
        return false;
      }
      return true;

    case 5: // Review & Submit
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

  // Validate email format
  if (formData.email && !validateEmail(formData.email)) {
    errors.push('Invalid email address format');
  }

  // Validate Pakistani phone number
  if (formData.phone && !validatePakistaniPhone(formData.phone)) {
    errors.push('Invalid Pakistani phone number format');
  }

  // Validate CNIC format
  if (formData.cnic && !validatePakistaniCNIC(formData.cnic)) {
    errors.push('Invalid Pakistani CNIC format (expected: XXXXX-XXXXXXX-X)');
  }

  // Validate guardian phone if provided
  if (formData.guardian.phone && !validatePakistaniPhone(formData.guardian.phone)) {
    errors.push('Invalid guardian Pakistani phone number format');
  }

  // Validate guardian CNIC if provided
  if (formData.guardian.cnic && !validatePakistaniCNIC(formData.guardian.cnic)) {
    errors.push('Invalid guardian Pakistani CNIC format (expected: XXXXX-XXXXXXX-X)');
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
