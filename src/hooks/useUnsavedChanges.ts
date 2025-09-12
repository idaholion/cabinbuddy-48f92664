import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
  onSave?: () => Promise<void>;
}

export const useUnsavedChanges = ({ 
  hasUnsavedChanges, 
  message = "You have unsaved changes. Are you sure you want to leave?",
  onSave
}: UseUnsavedChangesOptions) => {
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  const navigate = useNavigate();
  const location = useLocation();

  // Listen for navigation attempts (simplified approach without useBlocker)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        setShowNavigationDialog(true);
        setPendingNavigation(() => () => {
          window.history.go(1); // Complete the navigation
        });
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  const confirmNavigation = (callback: () => void) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(message);
      if (confirmed) {
        callback();
      }
      return confirmed;
    } else {
      callback();
      return true;
    }
  };

  const handleSaveAndContinue = async () => {
    if (onSave) {
      try {
        await onSave();
        setShowNavigationDialog(false);
        if (pendingNavigation) {
          pendingNavigation();
          setPendingNavigation(null);
        }
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }
  };

  const handleDiscardAndContinue = () => {
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowNavigationDialog(false);
    setPendingNavigation(null);
  };

  return { 
    confirmNavigation,
    showNavigationDialog,
    handleSaveAndContinue,
    handleDiscardAndContinue,
    handleCancelNavigation
  };
};