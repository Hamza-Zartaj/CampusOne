import { useState } from 'react';
import { scrollToTop } from '../utils/helpers';
import { validateStep } from '../utils/validation';

/**
 * Hook to manage multi-step form navigation
 */
export const useStepNavigation = (totalSteps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);

  const goToNextStep = (isValid = true) => {
    if (isValid) {
      const newStep = Math.min(currentStep + 1, totalSteps - 1);
      setCurrentStep(newStep);
      setMaxStepReached(prev => Math.max(prev, newStep));
      scrollToTop();
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    scrollToTop();
  };

  const goToStep = (stepIndex) => {
    if (stepIndex <= maxStepReached) {
      setCurrentStep(stepIndex);
      scrollToTop();
    }
  };

  const resetSteps = () => {
    setCurrentStep(0);
    setMaxStepReached(0);
  };

  return {
    currentStep,
    setCurrentStep,
    maxStepReached,
    setMaxStepReached,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    resetSteps,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    stepProgress: ((currentStep + 1) / totalSteps) * 100
  };
};
