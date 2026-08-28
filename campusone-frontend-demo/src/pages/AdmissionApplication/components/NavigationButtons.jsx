import React from 'react';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { TAILWIND_CLASSES } from '../utils/constants';

/**
 * NavigationButtons component for step navigation
 */
export const NavigationButtons = ({
  isFirstStep,
  isLastStep,
  onPreviousClick,
  onNextClick,
  onSubmitClick,
  isSubmitting = false
}) => {
  return (
    <div className="flex justify-between gap-4 mt-8 pt-8 border-t-2 border-gray-200 max-md:flex-col">
      {!isFirstStep && (
        <button
          type="button"
          className={`${TAILWIND_CLASSES.btnSecondary} max-md:w-full`}
          onClick={onPreviousClick}
        >
          <ChevronLeft size={18} />
          Previous
        </button>
      )}

      {!isLastStep ? (
        <button
          type="button"
          className={`${TAILWIND_CLASSES.btnPrimary} ${isFirstStep ? 'ml-auto' : ''} max-md:w-full`}
          onClick={onNextClick}
        >
          Next
          <ChevronRight size={18} />
        </button>
      ) : (
        <button
          type="button"
          className={`${TAILWIND_CLASSES.btnPrimary} min-w-50 max-md:w-full disabled:opacity-60 disabled:cursor-not-allowed`}
          disabled={isSubmitting}
          onClick={onSubmitClick}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></div>
              Submitting...
            </>
          ) : (
            <>
              <Send size={18} />
              Submit Application
            </>
          )}
        </button>
      )}
    </div>
  );
};
