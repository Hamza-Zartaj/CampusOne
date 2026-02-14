import React from 'react';
import { FormField, SelectField, FileField } from '../components/FormFields';
import { GUARDIAN_RELATIONS } from '../utils/constants';

/**
 * Step 1: Father/Guardian Information Section
 */
export const FatherGuardianInfo = ({ formData, handleChange, handleFileChange }) => {
  return (
    <section className="mb-8 pb-6 border-b border-gray-200">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        Father / Guardian Information
      </h2>

      {/* Relation and Name */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
        <SelectField
          label="Relation"
          name="relation"
          value={formData.fatherGuardian.relation}
          onChange={(e) => handleChange(e, 'fatherGuardian')}
          options={GUARDIAN_RELATIONS}
        />
        <FormField
          label="Name"
          name="name"
          value={formData.fatherGuardian.name}
          onChange={(e) => handleChange(e, 'fatherGuardian')}
          placeholder="Enter name"
        />
      </div>

      {/* Phone and CNIC */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
        <FormField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.fatherGuardian.phone}
          onChange={(e) => handleChange(e, 'fatherGuardian')}
          placeholder="03XX-XXXXXXX"
        />
        <FormField
          label="CNIC Number"
          name="cnic"
          value={formData.fatherGuardian.cnic}
          onChange={(e) => handleChange(e, 'fatherGuardian')}
          placeholder="XXXXX-XXXXXXX-X"
        />
      </div>

      {/* CNIC Upload */}
      <div className="flex flex-col">
        <FileField
          label="CNIC Upload (PDF, JPG, PNG - Max 5MB)"
          name="cnicUpload"
          onChange={(e) => handleFileChange(e, 'cnicUpload', 'fatherGuardian')}
          fileName={formData.fatherGuardian.cnicUpload?.name}
        />
      </div>
    </section>
  );
};
