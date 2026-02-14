import React from 'react';
import { TAILWIND_CLASSES } from '../utils/constants';

/**
 * Reusable FormField component for text inputs
 */
export const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error = '',
  className = ''
}) => {
  const inputClass = error ? TAILWIND_CLASSES.inputError : TAILWIND_CLASSES.input;

  return (
    <div className="flex flex-col">
      {label && (
        <label className={TAILWIND_CLASSES.label}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`${inputClass} ${className}`}
      />
      {error && <span className="block text-red-500 text-sm mt-1">{error}</span>}
    </div>
  );
};

/**
 * Reusable SelectField component
 */
export const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  error = '',
  disabled = false,
  className = ''
}) => {
  const inputClass = error ? TAILWIND_CLASSES.inputError : TAILWIND_CLASSES.input;

  return (
    <div className="flex flex-col">
      {label && (
        <label className={TAILWIND_CLASSES.label}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`${inputClass} ${className}`}
      >
        {options.map((option, index) => (
          <option key={index} value={typeof option === 'string' ? option : option.value}>
            {typeof option === 'string' ? option : option.label}
          </option>
        ))}
      </select>
      {error && <span className="block text-red-500 text-sm mt-1">{error}</span>}
    </div>
  );
};

/**
 * Reusable FileField component
 */
export const FileField = ({
  label,
  name,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  required = false,
  fileName = null,
  className = ''
}) => {
  return (
    <div className="flex flex-col">
      {label && (
        <label className={TAILWIND_CLASSES.label}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="file"
        name={name}
        onChange={onChange}
        accept={accept}
        required={required}
        className={`${TAILWIND_CLASSES.input} cursor-pointer p-2.5 ${className}`}
      />
      {fileName && (
        <span className="block mt-2 text-sm text-slate-500 italic">Selected: {fileName}</span>
      )}
    </div>
  );
};

/**
 * Reusable TextAreaField component
 */
export const TextAreaField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength = null,
  required = false,
  error = '',
  showCharCount = false,
  className = ''
}) => {
  const inputClass = error ? TAILWIND_CLASSES.inputError : TAILWIND_CLASSES.input;

  return (
    <div className="flex flex-col">
      {label && (
        <label className={TAILWIND_CLASSES.label}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        required={required}
        className={`${inputClass} resize-y min-h-30 ${className}`}
      />
      {error && <span className="block text-red-500 text-sm mt-1">{error}</span>}
      {showCharCount && maxLength && (
        <span className="text-sm text-slate-400 text-right mt-1">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
};
