import { useState } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_EDUCATION, BELOW_BACHELOR_LEVELS } from '../utils/constants';
import { validateEducationRecord } from '../utils/validation';

/**
 * Hook to manage education records
 */
export const useEducationRecords = (onEducationAdd, onEducationUpdate, onEducationDelete) => {
  const [currentEducation, setCurrentEducation] = useState(INITIAL_EDUCATION);
  const [editingIndex, setEditingIndex] = useState(null);
  const [educationErrors, setEducationErrors] = useState({});

  const handleEducationChange = (e) => {
    const { name, value } = e.target;
    setCurrentEducation(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (educationErrors[name]) {
      setEducationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Auto-set result type based on education level
    if (name === 'level') {
      if (BELOW_BACHELOR_LEVELS.includes(value)) {
        setCurrentEducation(prev => ({ ...prev, resultType: 'Percentage' }));
      } else if (value) {
        setCurrentEducation(prev => ({ ...prev, resultType: 'CGPA' }));
      }
    }
  };

  const handleEducationFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setCurrentEducation(prev => ({ ...prev, transcript: file }));
  };

  const validateEducation = () => {
    const errors = validateEducationRecord(currentEducation);
    setEducationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addEducation = (educationRecords) => {
    if (!validateEducation()) {
      toast.error('Please fill in all required education fields');
      return false;
    }

    if (editingIndex !== null) {
      const updated = [...educationRecords];
      updated[editingIndex] = currentEducation;
      onEducationUpdate?.(updated);
      toast.success('Education record updated');
      setEditingIndex(null);
    } else {
      onEducationAdd?.([...educationRecords, currentEducation]);
      toast.success('Education record added');
    }

    resetEducationForm();
    return true;
  };

  const editEducation = (index, record) => {
    setCurrentEducation(record);
    setEditingIndex(index);
  };

  const deleteEducation = (index, educationRecords) => {
    if (window.confirm('Are you sure you want to delete this education record?')) {
      const updated = educationRecords.filter((_, i) => i !== index);
      onEducationDelete?.(updated);
      toast.success('Education record deleted');

      if (editingIndex === index) {
        resetEducationForm();
      }
    }
  };

  const cancelEditEducation = () => {
    resetEducationForm();
  };

  const resetEducationForm = () => {
    setCurrentEducation(INITIAL_EDUCATION);
    setEditingIndex(null);
    setEducationErrors({});
  };

  return {
    currentEducation,
    setCurrentEducation,
    editingIndex,
    setEditingIndex,
    educationErrors,
    setEducationErrors,
    handleEducationChange,
    handleEducationFileChange,
    validateEducation,
    addEducation,
    editEducation,
    deleteEducation,
    cancelEditEducation,
    resetEducationForm
  };
};
