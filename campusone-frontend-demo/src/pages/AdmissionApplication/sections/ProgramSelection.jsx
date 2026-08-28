import React from 'react';
import { SelectField } from '../components/FormFields';

/**
 * Step 4: Program Selection Section
 */
export const ProgramSelection = ({ formData, programs, handleChange }) => {
  return (
    <section className="mb-8 pb-6 border-gray-200">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        Program Details
      </h2>

      <div className="flex flex-col">
        <SelectField
          label="Desired Program"
          name="program"
          value={formData.program}
          onChange={handleChange}
          options={[
            { value: '', label: 'Select a Program' },
            ...programs.map(p => ({ value: p.name, label: p.name }))
          ]}
          required
        />
      </div>
    </section>
  );
};
