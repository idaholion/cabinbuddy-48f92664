import { useState, useCallback } from 'react';

interface UseMultiStepFormOptions {
  initialStep?: number;
  totalSteps: number;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
}

export const useMultiStepForm = ({
  initialStep = 1,
  totalSteps,
  onStepChange,
  onComplete
}: UseMultiStepFormOptions) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    } else if (currentStep === totalSteps) {
      onComplete?.();
    }
  }, [currentStep, totalSteps, onStepChange, onComplete]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    }
  }, [currentStep, onStepChange]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
      onStepChange?.(step);
    }
  }, [totalSteps, onStepChange]);

  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  const markStepIncomplete = useCallback((step: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(step);
      return newSet;
    });
  }, []);

  const isStepCompleted = useCallback((step: number) => {
    return completedSteps.has(step);
  }, [completedSteps]);

  const canProceed = useCallback(() => {
    return currentStep < totalSteps;
  }, [currentStep, totalSteps]);

  const canGoBack = useCallback(() => {
    return currentStep > 1;
  }, [currentStep]);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const progressPercentage = (currentStep / totalSteps) * 100;

  return {
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    goToStep,
    markStepCompleted,
    markStepIncomplete,
    isStepCompleted,
    canProceed,
    canGoBack,
    isFirstStep,
    isLastStep,
    progressPercentage,
    completedSteps: Array.from(completedSteps)
  };
};