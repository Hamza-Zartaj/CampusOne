import React from 'react';
import { CheckCircle } from 'lucide-react';
import { TAILWIND_CLASSES } from '../utils/constants';

/**
 * SuccessMessage component shown after successful application submission
 */
export const SuccessMessage = ({ applicationNumber, email, onHomeClick }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="bg-white rounded-xl p-12 shadow-lg max-w-150 mx-auto max-md:p-6">
        <CheckCircle size={64} className="text-success mb-6 mx-auto" />
        <h2 className="text-slate-800 mb-4 text-[2rem] font-bold max-md:text-2xl">
          Application Submitted Successfully!
        </h2>
        <p className="bg-slate-100 p-4 rounded-lg my-6 text-lg">
          Your Application Number:{' '}
          <strong className="text-primary-500 text-xl">{applicationNumber}</strong>
        </p>
        <p className="text-slate-500 leading-relaxed mb-4">
          Thank you for applying! We have received your application and will review it shortly. You
          will receive updates via email at <strong>{email}</strong>.
        </p>
        <p className="text-slate-400 text-sm mb-8">Please save your application number for future reference.</p>
        <div className="flex justify-center">
          <button className={TAILWIND_CLASSES.btnPrimary} onClick={onHomeClick}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
