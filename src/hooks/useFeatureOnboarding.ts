import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface UseFeatureOnboardingProps {
  triggerKey?: string;
  checkProfileCompletion?: boolean;
}

export const useFeatureOnboarding = ({ 
  triggerKey, 
  checkProfileCompletion = false 
}: UseFeatureOnboardingProps = {}) => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Check if user has already seen the onboarding
    const hasSeenOnboarding = localStorage.getItem('hideFeatureOverview') === 'true';
    
    if (hasSeenOnboarding || !user) {
      setShouldShowOnboarding(false);
      return;
    }

    // Check for specific trigger conditions
    if (triggerKey) {
      const hasTriggered = localStorage.getItem(`onboarding-${triggerKey}`) === 'true';
      if (!hasTriggered) {
        setShouldShowOnboarding(true);
        localStorage.setItem(`onboarding-${triggerKey}`, 'true');
      }
    }

    // Check if this is first time after profile completion
    if (checkProfileCompletion) {
      const hasCompletedProfile = localStorage.getItem('profileCompleted') === 'true';
      if (hasCompletedProfile && !localStorage.getItem('onboardingShownAfterProfile')) {
        setShouldShowOnboarding(true);
        localStorage.setItem('onboardingShownAfterProfile', 'true');
      }
    }
  }, [user, triggerKey, checkProfileCompletion]);

  const hideOnboarding = () => {
    setShouldShowOnboarding(false);
  };

  const markProfileCompleted = () => {
    localStorage.setItem('profileCompleted', 'true');
  };

  const resetOnboarding = () => {
    localStorage.removeItem('hideFeatureOverview');
    localStorage.removeItem('onboardingShownAfterProfile');
    if (triggerKey) {
      localStorage.removeItem(`onboarding-${triggerKey}`);
    }
    setShouldShowOnboarding(true);
  };

  return {
    shouldShowOnboarding,
    hideOnboarding,
    markProfileCompleted,
    resetOnboarding,
    userRole: isAdmin ? "admin" as const : "host" as const
  };
};