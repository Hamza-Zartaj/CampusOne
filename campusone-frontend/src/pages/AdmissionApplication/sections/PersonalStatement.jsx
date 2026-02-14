import React from 'react';
import { FileText } from 'lucide-react';
import { TextAreaField } from '../components/FormFields';

/**
 * Step 5: Personal Statement Section
 */
export const PersonalStatement = ({ formData, handleChange }) => {
  return (
    <section className="mb-8 pb-6 border-b border-gray-200">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        <FileText size={20} />
        Personal Statement
      </h2>

      <div className="flex flex-col">
        <TextAreaField
          label="Tell us about yourself and why you want to join our institution (max 2000 characters)"
          name="personalStatement"
          value={formData.personalStatement}
          onChange={handleChange}
          rows={4}
          maxLength={2000}
          placeholder="Share your goals, interests, and what makes you a great fit..."
          showCharCount
        />
      </div>
    </section>
  );
};
