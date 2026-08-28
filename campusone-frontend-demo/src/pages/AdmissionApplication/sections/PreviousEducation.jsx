import React from 'react';
import { FormField, SelectField, FileField } from '../components/FormFields';
import { EDUCATION_LEVELS, RESULT_TYPES, BELOW_BACHELOR_LEVELS, TAILWIND_CLASSES } from '../utils/constants';

/**
 * Step 2: Previous Education Section
 */
export const PreviousEducation = ({
  formData,
  currentEducation,
  educationErrors,
  fileInputKey,
  handleEducationChange,
  handleEducationFileChange,
  onAddEducation,
  onEditEducation,
  onDeleteEducation,
  onCancelEdit,
  editingIndex
}) => {
  // Get result type options based on education level
  const getResultTypeOptions = () => {
    if (BELOW_BACHELOR_LEVELS.includes(currentEducation.level)) {
      return [
        { value: '', label: 'Select Result Type' },
        { value: RESULT_TYPES.PERCENTAGE, label: 'Percentage' },
        { value: RESULT_TYPES.MARKS, label: 'Marks' }
      ];
    }
    return [
      { value: '', label: 'Select Result Type' },
      { value: RESULT_TYPES.CGPA, label: 'CGPA' }
    ];
  };

  // Get placeholder for result field
  const getResultPlaceholder = () => {
    switch (currentEducation.resultType) {
      case RESULT_TYPES.CGPA:
        return 'e.g., 3.5';
      case RESULT_TYPES.PERCENTAGE:
        return 'e.g., 85%';
      case RESULT_TYPES.MARKS:
        return 'e.g., 850/1100';
      default:
        return 'Enter result';
    }
  };

  return (
    <section className="mb-8 pb-6 border-gray-200" id="education-form-section">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        Previous Education
      </h2>
      <p className="text-slate-500 mb-6 text-[0.95rem]">
        Add your academic history below. You can add multiple education records (Matric, Intermediate,
        Bachelor's, Master's, etc.)
      </p>

      {/* Education Entry Form */}
      <div className="p-6 rounded-lg mb-8 border border-gray-200">
        <h3 className="m-0 mb-6 text-slate-800 text-lg font-semibold">
          {editingIndex !== null ? 'Edit Education Record' : 'Add Education Record'}
        </h3>

        {/* Level and Degree Name */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
          <SelectField
            label="Education Level"
            name="level"
            value={currentEducation.level}
            onChange={handleEducationChange}
            options={['Select Level', ...EDUCATION_LEVELS]}
            required
            error={educationErrors.level}
          />
          <FormField
            label="Degree / Program Name"
            name="degreeName"
            value={currentEducation.degreeName}
            onChange={handleEducationChange}
            placeholder="e.g., BS Computer Science, SSC Science"
            required
            error={educationErrors.degreeName}
          />
        </div>

        {/* Institution and Board */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
          <FormField
            label="School / Institute / College / University Name"
            name="institution"
            value={currentEducation.institution}
            onChange={handleEducationChange}
            placeholder="Institution name"
            required
            error={educationErrors.institution}
          />
          <FormField
            label="Board / University"
            name="board"
            value={currentEducation.board}
            onChange={handleEducationChange}
            placeholder="e.g., FBISE, University of Punjab"
            required
            error={educationErrors.board}
          />
        </div>

        {/* Year, Result Type, Result */}
        <div className="grid grid-cols-3 gap-6 mb-6 max-md:grid-cols-1">
          <FormField
            label="Graduation / Completion Year"
            name="completionYear"
            type="number"
            value={currentEducation.completionYear}
            onChange={handleEducationChange}
            placeholder="2020"
            required
            error={educationErrors.completionYear}
          />
          <SelectField
            label="Result Type"
            name="resultType"
            value={currentEducation.resultType}
            onChange={handleEducationChange}
            options={getResultTypeOptions()}
            required
            error={educationErrors.resultType}
            disabled={!currentEducation.level}
          />
          <FormField
            label="Result"
            name="result"
            value={currentEducation.result}
            onChange={handleEducationChange}
            placeholder={getResultPlaceholder()}
            required
            error={educationErrors.result}
          />
        </div>

        {/* Transcript Upload */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
          <FileField
            key={fileInputKey}
            label="Transcript Upload"
            name="transcript"
            onChange={handleEducationFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            required
            fileName={currentEducation.transcript?.name}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end mt-6 max-md:flex-col">
          {editingIndex !== null && (
            <button
              type="button"
              className={`${TAILWIND_CLASSES.btnSecondary} max-md:w-full`}
              onClick={onCancelEdit}
            >
              Cancel Edit
            </button>
          )}
          <button
            type="button"
            className={`${TAILWIND_CLASSES.btnPrimary} max-md:w-full`}
            onClick={() => onAddEducation(formData.educationRecords)}
          >
            {editingIndex !== null ? 'Update Education' : 'Add Education'}
          </button>
        </div>
      </div>

      {/* Education Records Table */}
      {formData.educationRecords.length > 0 && (
        <div className="mt-8">
          <h3 className="m-0 mb-4 text-slate-800 text-lg font-semibold">
            Added Education Records ({formData.educationRecords.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full border-collapse min-w-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">
                    Level
                  </th>
                  <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">
                    Degree/Program
                  </th>
                  <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">
                    Institution
                  </th>
                  <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">
                    Board/University
                  </th>
                  <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">
                    Year
                  </th>
                  <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">
                    Result
                  </th>
                  <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.educationRecords.map((edu, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                      {edu.level}
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                      {edu.degreeName}
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                      {edu.institution}
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                      {edu.board}
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                      {edu.completionYear}
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                      {edu.result} ({edu.resultType})
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                      <div className="flex gap-2 max-md:flex-col max-md:gap-1">
                        <button
                          type="button"
                          className="py-2 px-4 border-none rounded-lg text-sm font-medium cursor-pointer transition-all bg-primary-500 text-white hover:bg-primary-700 max-md:w-full max-md:py-2"
                          onClick={() => onEditEducation(index, formData.educationRecords[index])}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="py-2 px-4 border-none rounded-lg text-sm font-medium cursor-pointer transition-all bg-red-500 text-white hover:opacity-90 max-md:w-full max-md:py-2"
                          onClick={() => onDeleteEducation(index, formData.educationRecords)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
