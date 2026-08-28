import React from 'react';
import { UserPlus } from 'lucide-react';

/**
 * Header component for Admission Application
 */
export const Header = ({ instructions, onBackClick }) => {
  return (
    <div className="mb-8">
      <button
        className="bg-transparent border-none text-primary-500 text-base font-semibold cursor-pointer py-2 mb-4 inline-flex items-center gap-2 transition-all hover:text-primary-700 hover:-translate-x-1"
        onClick={onBackClick}
      >
        ← Back to Home
      </button>
      <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
        <UserPlus size={32} className="text-primary-500 shrink-0" />
        <div>
          <h1 className="m-0 text-[2rem] text-slate-800 font-bold max-md:text-2xl">
            Admission Application
          </h1>
          <p className="text-slate-500 mt-2 mb-0 text-base">{instructions}</p>
        </div>
      </div>
    </div>
  );
};
