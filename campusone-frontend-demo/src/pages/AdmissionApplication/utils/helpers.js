import { BELOW_BACHELOR_LEVELS } from './constants';

// Handle nested field changes
export const handleNestedChange = (setFormData, section, subsection = null) => {
  return (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      if (subsection) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [subsection]: {
              ...prev[section][subsection],
              [name]: value
            }
          }
        };
      } else {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [name]: value
          }
        };
      }
    });
  };
};

// Handle nested file uploads
export const handleNestedFileChange = (setFormData, fieldName, section = null) => {
  return (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
  };
};

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Determine result type based on education level
export const getResultTypeForLevel = (level) => {
  if (BELOW_BACHELOR_LEVELS.includes(level)) {
    return 'Percentage';
  }
  return 'CGPA';
};

// Get appropriate placeholder based on result type
export const getResultPlaceholder = (resultType) => {
  switch (resultType) {
    case 'CGPA':
      return 'e.g., 3.5';
    case 'Percentage':
      return 'e.g., 85%';
    case 'Marks':
      return 'e.g., 850/1100';
    default:
      return 'Enter result';
  }
};

// Scroll to element smoothly
export const scrollToElement = (elementId, options = {}) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      ...options
    });
  }
};

// Scroll to top smoothly
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};
