import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { UI_CLASSES } from '../config/userManagementConfig';

const ModalHeader = ({ title, onClose }) => (
  <div className="flex justify-between items-center p-6 border-b border-gray-200">
    <h2 className="text-2xl font-bold text-slate-800 m-0">{title}</h2>
    <button
      className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1"
      onClick={onClose}
    >
      <X size={20} />
    </button>
  </div>
);

const ErrorAlert = ({ error, onClose }) => {
  if (!error) return null;
  return (
    <div className="flex items-center gap-3 py-4 px-5 rounded-lg mx-6 mt-4 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
      <AlertCircle size={18} />
      <span>{error}</span>
      <button
        onClick={onClose}
        className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const ModalFooter = ({ onCancel, onSubmit, submitText = 'Save', submitVariant = 'primary', isLoading = false }) => (
  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
    <button type="button" className={UI_CLASSES.btnSecondary} onClick={onCancel}>
      Cancel
    </button>
    <button
      type="submit"
      className={submitVariant === 'danger' ? `${UI_CLASSES.btnPrimary} bg-red-600 hover:bg-red-700` : UI_CLASSES.btnPrimary}
      onClick={onSubmit}
      disabled={isLoading}
    >
      {submitText}
    </button>
  </div>
);

export { ModalHeader, ErrorAlert, ModalFooter };
