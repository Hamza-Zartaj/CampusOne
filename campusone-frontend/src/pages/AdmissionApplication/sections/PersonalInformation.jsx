import React from 'react';
import { FormField, SelectField, FileField } from '../components/FormFields';
import { GENDER_OPTIONS, TAILWIND_CLASSES } from '../utils/constants';

/**
 * Step 0: Personal Information Section
 */
export const PersonalInformation = ({ formData, handleChange, handleFileChange }) => {
  return (
    <section className="mb-8 pb-6 border-b border-gray-200">
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
        <FormField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your.email@example.com"
          required
        />
        <FormField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="03XX-XXXXXXX"
          required
        />
        <FormField
          label="CNIC Number"
          name="cnic"
          value={formData.cnic}
          onChange={handleChange}
          placeholder="XXXXX-XXXXXXX-X"
          required
        />
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
