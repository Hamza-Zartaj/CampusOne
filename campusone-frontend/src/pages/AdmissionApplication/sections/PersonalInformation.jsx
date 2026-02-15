import React, { useState, useEffect } from 'react';
import { FormField, SelectField, FileField } from '../components/FormFields';
import { GENDER_OPTIONS, TAILWIND_CLASSES } from '../utils/constants';
import { admissionAPI } from '../../../utils/api';

/**
 * Step 0: Personal Information Section
 */
export const PersonalInformation = ({ formData, handleChange, handleFileChange }) => {
  const [duplicateErrors, setDuplicateErrors] = useState({
    email: '',
    cnic: '',
    phone: ''
  });
  const [checking, setChecking] = useState(false);

  // Debounce check for duplicates
  useEffect(() => {
    const checkForDuplicates = async () => {
      if (!formData.email || !formData.cnic || !formData.phone) return;

      setChecking(true);
      const errors = {};

      // Check email
      if (formData.email) {
        try {
          const response = await admissionAPI.checkDuplicateEmail(formData.email);
          if (response.data.exists) {
            errors.email = 'This email has already submitted an application';
          } else {
            errors.email = '';
          }
        } catch (error) {
          console.error('Error checking email:', error);
        }
      }

      // Check CNIC
      if (formData.cnic) {
        try {
          const response = await admissionAPI.checkDuplicateCNIC(formData.cnic);
          if (response.data.exists) {
            errors.cnic = 'This CNIC has already submitted an application';
          } else {
            errors.cnic = '';
          }
        } catch (error) {
          console.error('Error checking CNIC:', error);
        }
      }

      // Check phone
      if (formData.phone) {
        try {
          const response = await admissionAPI.checkDuplicatePhone(formData.phone);
          if (response.data.exists) {
            errors.phone = 'This phone number has already submitted an application';
          } else {
            errors.phone = '';
          }
        } catch (error) {
          console.error('Error checking phone:', error);
        }
      }

      setDuplicateErrors(errors);
      setChecking(false);
    };

    // Debounce the check - wait 1 second after user stops typing
    const debounceTimer = setTimeout(checkForDuplicates, 1000);
    return () => clearTimeout(debounceTimer);
  }, [formData.email, formData.cnic, formData.phone]);
  return (
    <section className="mb-8 pb-6 border-gray-200">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        Personal Information
      </h2>

      {/* Full Name, Date of Birth, Gender */}
      <div className="grid grid-cols-3 gap-6 mb-6 max-md:grid-cols-1">
        <FormField
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
        />
        <FormField
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleChange}
          required
        />
        <SelectField
          label="Gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          options={GENDER_OPTIONS}
        />
      </div>

      {/* Email, Phone, CNIC */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
        <div>
          <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            required
            error={duplicateErrors.email}
          />
          {checking && formData.email && <span className="text-sm text-blue-500 mt-1">Checking...</span>}
        </div>
        <div>
          <FormField
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="03XX-XXXXXXX"
            required
            error={duplicateErrors.phone}
          />
          {checking && formData.phone && <span className="text-sm text-blue-500 mt-1">Checking...</span>}
        </div>
        <div>
          <FormField
            label="CNIC Number"
            name="cnic"
            value={formData.cnic}
            onChange={handleChange}
            placeholder="XXXXX-XXXXXXX-X"
            required
            error={duplicateErrors.cnic}
          />
          {checking && formData.cnic && <span className="text-sm text-blue-500 mt-1">Checking...</span>}
        </div>
      </div>

      {/* CNIC Front and Back */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        <FileField
          label="CNIC Front (PDF, JPG, PNG - Max 5MB)"
          name="cnicFront"
          onChange={(e) => handleFileChange(e, 'cnicFront')}
          fileName={formData.cnicFront?.name}
        />
        <FileField
          label="CNIC Back (PDF, JPG, PNG - Max 5MB)"
          name="cnicBack"
          onChange={(e) => handleFileChange(e, 'cnicBack')}
          fileName={formData.cnicBack?.name}
        />
      </div>
    </section>
  );
};
