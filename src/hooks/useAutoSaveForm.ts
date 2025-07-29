import { useEffect, useRef } from 'react';
import { useAutoSave } from './useAutoSave';

interface UseAutoSaveFormOptions {
  formData: any;
  formKey: string;
  onLoad?: (data: any) => void;
  enabled?: boolean;
  delay?: number;
}

export const useAutoSaveForm = ({ 
  formData, 
  formKey, 
  onLoad, 
  enabled = true, 
  delay = 2000 
}: UseAutoSaveFormOptions) => {
  const { loadSavedData, clearSavedData } = useAutoSave({
    key: formKey,
    data: formData,
    delay,
    enabled,
  });
  
  const hasLoaded = useRef(false);

  // Load saved data on mount
  useEffect(() => {
    if (!hasLoaded.current && onLoad) {
      const savedData = loadSavedData();
      if (savedData) {
        onLoad(savedData);
      }
      hasLoaded.current = true;
    }
  }, [loadSavedData, onLoad]);

  return {
    clearSavedData,
    loadSavedData,
  };
};