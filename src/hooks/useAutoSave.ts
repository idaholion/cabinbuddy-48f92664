import { useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface UseAutoSaveOptions {
  key: string;
  data: any;
  delay?: number;
  enabled?: boolean;
}

export const useAutoSave = ({ key, data, delay = 2000, enabled = true }: UseAutoSaveOptions) => {
  const debouncedData = useDebounce(data, delay);
  const initialLoad = useRef(true);

  // Load saved data on mount
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
      return null;
    }
  };

  // Save data to localStorage
  useEffect(() => {
    if (!enabled || initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    try {
      localStorage.setItem(`autosave_${key}`, JSON.stringify(debouncedData));
      console.log(`Auto-saved form data for ${key}`);
    } catch (error) {
      console.warn('Failed to auto-save data:', error);
    }
  }, [debouncedData, key, enabled]);

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(`autosave_${key}`);
    } catch (error) {
      console.warn('Failed to clear auto-saved data:', error);
    }
  };

  return {
    loadSavedData,
    clearSavedData,
  };
};