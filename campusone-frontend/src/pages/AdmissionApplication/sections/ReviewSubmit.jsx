import React from 'react';

/**
 * Step 6: Review & Submit Section
 */
export const ReviewSubmit = ({ formData }) => {
  const ReviewItem = ({ label, value }) => (
    <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500">
      <strong className="text-slate-800 block mb-1 text-sm">{label}:</strong>
      {value}
    </div>
  );

  const ReviewSection = ({ title, children }) => (
    <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
      <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">
        {title}
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {children}
      </div>
    </div>
  );

  return (
    <section className="mb-8 pb-6 border-b border-gray-200">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        Review Your Application
      </h2>

      {/* Personal Information Review */}
      <ReviewSection title="Personal Information">
        <ReviewItem label="Full Name" value={formData.fullName} />
        <ReviewItem label="Date of Birth" value={formData.dateOfBirth} />
        <ReviewItem label="Gender" value={formData.gender} />
        <ReviewItem label="Email" value={formData.email} />
        <ReviewItem label="Phone" value={formData.phone} />
        <ReviewItem label="CNIC" value={formData.cnic} />
        <ReviewItem label="CNIC Front" value={formData.cnicFront?.name || 'Not uploaded'} />
        <ReviewItem label="CNIC Back" value={formData.cnicBack?.name || 'Not uploaded'} />
      </ReviewSection>

      {/* Father/Guardian Information Review */}
      {(formData.fatherGuardian.name || formData.fatherGuardian.relation) && (
        <ReviewSection title="Father/Guardian Information">
          {formData.fatherGuardian.relation && (
            <ReviewItem label="Relation" value={formData.fatherGuardian.relation} />
          )}
          {formData.fatherGuardian.name && (
            <ReviewItem label="Name" value={formData.fatherGuardian.name} />
          )}
          {formData.fatherGuardian.phone && (
            <ReviewItem label="Phone" value={formData.fatherGuardian.phone} />
          )}
          {formData.fatherGuardian.cnic && (
            <ReviewItem label="CNIC" value={formData.fatherGuardian.cnic} />
          )}
        </ReviewSection>
      )}

      {/* Previous Education Review */}
      <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
        <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">
          Previous Education
        </h3>
        {formData.educationRecords.map((edu, index) => (
          <div
            key={index}
            className="mb-6 p-4 bg-white rounded-lg border border-gray-200 last:mb-0"
          >
            <h4 className="text-primary-500 text-base m-0 mb-3 font-semibold">
              {edu.level} - {edu.degreeName}
            </h4>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              <ReviewItem label="Institution" value={edu.institution} />
              <ReviewItem label="Board/University" value={edu.board} />
              <ReviewItem label="Year" value={edu.completionYear} />
              <ReviewItem label="Result" value={`${edu.result} (${edu.resultType})`} />
            </div>
          </div>
        ))}
      </div>

      {/* Address & Nationality Review */}
      <ReviewSection title="Address & Nationality">
        <ReviewItem label="Nationality" value={formData.address.nationality} />
        {formData.address.street && <ReviewItem label="Street" value={formData.address.street} />}
        {formData.address.city && <ReviewItem label="City" value={formData.address.city} />}
        {formData.address.state && (
          <ReviewItem label="State/Province" value={formData.address.state} />
        )}
        {formData.address.country && (
          <ReviewItem label="Country" value={formData.address.country} />
        )}
        {formData.address.zipCode && (
          <ReviewItem label="Zip Code" value={formData.address.zipCode} />
        )}
      </ReviewSection>

      {/* Program Details Review */}
      <ReviewSection title="Program Details">
        <ReviewItem label="Selected Program" value={formData.program} />
      </ReviewSection>

      {/* Personal Statement Review */}
      {formData.personalStatement && (
        <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
          <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">
            Personal Statement
          </h3>
          <p className="p-4 bg-white rounded-lg text-slate-500 leading-relaxed whitespace-pre-wrap">
            {formData.personalStatement}
          </p>
        </div>
      )}
    </section>
  );
};
