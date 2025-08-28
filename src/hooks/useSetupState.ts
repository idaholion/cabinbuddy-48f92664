import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';

interface SetupState {
  isInSetupFlow: boolean;
  needsOrganization: boolean;
  hasIncompleteSetup: boolean;
  setupStep: 'initial' | 'organization' | 'family' | 'complete';
}

const SETUP_STORAGE_KEY = 'user_setup_state';

export const useSetupState = () => {
  const { user } = useAuth();
  const { organizations, loading: orgLoading } = useRobustMultiOrganization();
  
  const [setupState, setSetupState] = useState<SetupState>({
    isInSetupFlow: false,
    needsOrganization: false,
    hasIncompleteSetup: false,
    setupStep: 'complete'
  });

  // Get stored setup state from localStorage
  const getStoredSetupState = useCallback(() => {
    if (!user) return null;
    
    try {
      const stored = localStorage.getItem(`${SETUP_STORAGE_KEY}_${user.id}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [user]);

  // Store setup state in localStorage
  const storeSetupState = useCallback((state: SetupState) => {
    if (!user) return;
    
    try {
      localStorage.setItem(`${SETUP_STORAGE_KEY}_${user.id}`, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to store setup state:', error);
    }
  }, [user]);

  // Clear setup state (when setup is complete)
  const clearSetupState = useCallback(() => {
    if (!user) return;
    
    try {
      localStorage.removeItem(`${SETUP_STORAGE_KEY}_${user.id}`);
    } catch (error) {
      console.warn('Failed to clear setup state:', error);
    }
    
    setSetupState({
      isInSetupFlow: false,
      needsOrganization: false,
      hasIncompleteSetup: false,
      setupStep: 'complete'
    });
  }, [user]);

  // Mark user as entering setup flow
  const enterSetupFlow = useCallback((step: SetupState['setupStep'] = 'initial') => {
    const newState: SetupState = {
      isInSetupFlow: true,
      needsOrganization: organizations.length === 0,
      hasIncompleteSetup: true,
      setupStep: step
    };
    
    setSetupState(newState);
    storeSetupState(newState);
  }, [organizations.length, storeSetupState]);

  // Update setup step
  const updateSetupStep = useCallback((step: SetupState['setupStep']) => {
    const newState = { ...setupState, setupStep: step };
    setSetupState(newState);
    storeSetupState(newState);
  }, [setupState, storeSetupState]);

  // Determine setup state based on user and organization data
  useEffect(() => {
    if (!user || orgLoading) return;

    const storedState = getStoredSetupState();
    
    // If user has no organizations, they need setup
    if (organizations.length === 0) {
      const newState: SetupState = {
        isInSetupFlow: storedState?.isInSetupFlow ?? true,
        needsOrganization: true,
        hasIncompleteSetup: true,
        setupStep: storedState?.setupStep ?? 'initial'
      };
      
      setSetupState(newState);
      if (!storedState) {
        storeSetupState(newState);
      }
      return;
    }

    // User has organizations - clear setup state to allow normal navigation
    const completedState: SetupState = {
      isInSetupFlow: false,
      needsOrganization: false,
      hasIncompleteSetup: false,
      setupStep: 'complete'
    };
    
    setSetupState(completedState);
    // Clear any stored setup state since organization exists
    if (storedState?.isInSetupFlow) {
      try {
        localStorage.removeItem(`${SETUP_STORAGE_KEY}_${user.id}`);
      } catch (error) {
        console.warn('Failed to clear setup state:', error);
      }
    }
  }, [user, organizations, orgLoading, getStoredSetupState, storeSetupState]);

  // Get the appropriate redirect path based on setup state
  const getSetupRedirectPath = useCallback(() => {
    if (!setupState.isInSetupFlow) return null;
    
    switch (setupState.setupStep) {
      case 'initial':
        return '/setup';
      case 'organization':
        return '/manage-organizations';
      case 'family':
        return '/family-setup';
      default:
        return '/setup';
    }
  }, [setupState]);

  return {
    setupState,
    enterSetupFlow,
    updateSetupStep,
    clearSetupState,
    getSetupRedirectPath,
    loading: orgLoading
  };
};