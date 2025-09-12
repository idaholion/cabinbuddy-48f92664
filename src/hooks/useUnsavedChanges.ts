import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, UNSAFE_NavigationContext } from 'react-router-dom';
import { useContext } from 'react';

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
  const navigate = useNavigate();
  const location = useLocation();
  const navigationContext = useContext(UNSAFE_NavigationContext);
  const originalNavigate = useRef<any>(null);

  // Block browser navigation (refresh, back button, tab close)
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

  // Block React Router navigation (sidebar, programmatic navigation)
  useEffect(() => {
    if (!navigationContext?.navigator) return;

    if (hasUnsavedChanges) {
      // Store original navigate function
      if (!originalNavigate.current) {
        originalNavigate.current = navigationContext.navigator.go;
      }

      // Override the navigate function
      const originalGo = navigationContext.navigator.go;
      const originalPush = navigationContext.navigator.push;
      const originalReplace = navigationContext.navigator.replace;

      navigationContext.navigator.go = (delta: number) => {
        setShowNavigationDialog(true);
        setPendingNavigation(() => () => originalGo(delta));
      };

      navigationContext.navigator.push = (to: any, state?: any) => {
        setShowNavigationDialog(true);
        setPendingNavigation(() => () => originalPush(to, state));
      };

      navigationContext.navigator.replace = (to: any, state?: any) => {
        setShowNavigationDialog(true);
        setPendingNavigation(() => () => originalReplace(to, state));
      };

      return () => {
        // Restore original functions
        navigationContext.navigator.go = originalGo;
        navigationContext.navigator.push = originalPush;
        navigationContext.navigator.replace = originalReplace;
      };
    }
  }, [hasUnsavedChanges, navigationContext]);

  // Listen for popstate events (browser back/forward)
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
      setShowNavigationDialog(true);
      setPendingNavigation(() => callback);
      return false;
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