import React from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const AdmissionStatusToggle = ({ isOpen, onToggle, saving, isLoading }) => {
  return (
    <div className="bg-white rounded-xl p-8 mb-6 shadow-sm border-2 border-gray-200">
      <div className="flex justify-between items-center gap-4 mb-4 flex-wrap max-md:flex-col max-md:items-start">
        <div>
          <h3 className="text-2xl font-semibold text-slate-800 m-0 mb-2">Admission Status</h3>
          <p className="text-slate-500 m-0">Enable or disable admission applications</p>
        </div>
        <button
          className={`flex items-center gap-2 py-3 px-6 border-none rounded-full font-semibold text-base cursor-pointer transition-all max-md:w-full max-md:justify-center ${
            isOpen
              ? 'bg-success text-white hover:bg-green-600 hover:scale-105'
              : 'bg-danger text-white hover:bg-red-600 hover:scale-105'
          } disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
          onClick={onToggle}
          disabled={saving || isLoading}
        >
          {isOpen ? (
            <>
              <CheckCircle size={20} />
              OPEN
            </>
          ) : (
            <>
              <XCircle size={20} />
              CLOSED
            </>
          )}
        </button>
      </div>
      <div
        className={`p-4 rounded-lg font-medium text-center ${
          isOpen
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
        {isOpen
          ? '✅ Students can now submit admission applications'
          : '❌ Admission applications are currently closed'}
      </div>
    </div>
  );
};

export default AdmissionStatusToggle;
