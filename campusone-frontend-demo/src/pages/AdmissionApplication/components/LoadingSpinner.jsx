import React from 'react';

/**
 * LoadingSpinner component
 */
export const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500">{message}</p>
    </div>
  );
};
