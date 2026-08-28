import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * StepIndicator component for showing form progress
 */
export const StepIndicator = ({
  steps,
  currentStep,
  maxStepReached,
  onStepClick
}) => {
  return (
    <div className="flex justify-between my-8 px-4 relative max-md:overflow-x-auto max-md:pb-4">
      {/* Progress bar */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>

      {/* Steps */}
      {steps.map((step, index) => (
        <div
          key={index}
          className={`flex flex-col items-center gap-2 relative z-10 flex-1 transition-all max-md:min-w-20 ${
            index <= maxStepReached ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
          }`}
          onClick={() => onStepClick(index)}
        >
          {/* Step circle */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all max-md:w-8.75 max-md:h-8.75 ${
              index === currentStep
                ? 'bg-gradient-primary border-2 border-primary-500 text-white scale-110'
                : index < currentStep
                ? 'bg-primary-500 border-2 border-primary-500 text-white'
                : 'bg-white border-2 border-gray-300 text-slate-500'
            }`}
          >
            {index < currentStep ? <CheckCircle size={20} /> : index + 1}
          </div>

          {/* Step label */}
          <div
            className={`text-xs font-medium text-center max-w-25 max-md:text-[0.65rem] max-md:max-w-20 ${
              index === currentStep
                ? 'text-primary-500 font-semibold'
                : index < currentStep
                ? 'text-primary-500'
                : 'text-slate-500'
            }`}
          >
            {step.title}
          </div>
        </div>
      ))}
    </div>
  );
};
