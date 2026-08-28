import { useState } from 'react';
import { INITIAL_FORM_DATA } from '../utils/constants';

/**
 * Hook to manage the main admission form state
 */
export const useAdmissionForm = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const handleChange = (e, section = null, subsection = null) => {
    const { name, value } = e.target;

    if (section && subsection) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [name]: value
          }
        }
      }));
    } else if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e, fieldName, section = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Only PDF, JPG, and PNG files are allowed' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File size must be less than 5MB' };
    }

    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [fieldName]: file
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }

    return { success: true };
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleFileChange,
    resetForm
  };
};
