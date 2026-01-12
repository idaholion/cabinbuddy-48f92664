import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = 'cbOnboardingCompleted';

interface UseCBOnboardingReturn {
  shouldShowGuide: boolean;
  completeGuide: () => void;
  skipGuide: () => void;
  resetGuide: () => void;
}

export const useCBOnboarding = (): UseCBOnboardingReturn => {
  const [shouldShowGuide, setShouldShowGuide] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a new organization creator (came from signup with mode=start)
    const signupData = localStorage.getItem('signupData');
    const hasCompletedOnboarding = localStorage.getItem(STORAGE_KEY) === 'true';
    
    // Show guide if:
    // 1. User has signup data (new org creator)
    // 2. Has not completed the onboarding guide yet
    if (signupData && !hasCompletedOnboarding) {
      setShouldShowGuide(true);
    }
  }, []);

  const completeGuide = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShouldShowGuide(false);
  }, []);

  const skipGuide = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShouldShowGuide(false);
  }, []);

  const resetGuide = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setShouldShowGuide(true);
  }, []);

  return {
    shouldShowGuide,
    completeGuide,
    skipGuide,
    resetGuide,
  };
};
