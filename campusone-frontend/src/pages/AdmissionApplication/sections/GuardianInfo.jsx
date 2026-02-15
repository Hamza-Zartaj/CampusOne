import React from 'react';
import { FormField, SelectField, FileField } from '../components/FormFields';
import { GUARDIAN_RELATIONS } from '../utils/constants';

/**
 * Step 1: Guardian Information Section
 */
export const GuardianInfo = ({ formData, handleChange, handleFileChange }) => {
  return (
    <section className="mb-8 pb-6 border-gray-200">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        Guardian Information
      </h2>

      {/* Relation and Name */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
        <SelectField
          label="Relation"
          name="relation"
          value={formData.guardian.relation}
          onChange={(e) => handleChange(e, 'guardian')}
          options={GUARDIAN_RELATIONS}
        />
        <FormField
          label="Name"
          name="name"
          value={formData.guardian.name}
          onChange={(e) => handleChange(e, 'guardian')}
          placeholder="Enter name"
        />
      </div>

      {/* Phone and CNIC */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
        <FormField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.guardian.phone}
          onChange={(e) => handleChange(e, 'guardian')}
          placeholder="03XX-XXXXXXX"
        />
        <FormField
          label="CNIC Number"
          name="cnic"
          value={formData.guardian.cnic}
          onChange={(e) => handleChange(e, 'guardian')}
          placeholder="XXXXX-XXXXXXX-X"
        />
      </div>

      {/* CNIC Upload */}
      <div className="flex flex-col">
        <FileField
          label="CNIC Upload (PDF, JPG, PNG - Max 5MB)"
          name="cnicUpload"
          onChange={(e) => handleFileChange(e, 'cnicUpload', 'guardian')}
          fileName={formData.guardian.cnicUpload?.name}
        />
      </div>
    </section>
  );
};
