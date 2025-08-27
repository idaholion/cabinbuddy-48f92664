import { useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { useAuth } from '@/contexts/AuthContext';

interface UseAutoSaveOptions {
  key: string;
  data: any;
  delay?: number;
  enabled?: boolean;
}

export const useAutoSave = ({ key, data, delay = 2000, enabled = true }: UseAutoSaveOptions) => {
  const { user } = useAuth();
  const debouncedData = useDebounce(data, delay);
  const initialLoad = useRef(true);

  // Generate user-specific key
  const getUserSpecificKey = (baseKey: string) => {
    return user?.id ? `autosave_${baseKey}_${user.id}` : null;
  };

  // Load saved data on mount
  const loadSavedData = () => {
    const userKey = getUserSpecificKey(key);
    if (!userKey) return null;

    try {
      const saved = localStorage.getItem(userKey);
      if (!saved) return null;
      
      const parsedData = JSON.parse(saved);
      
      // Validate the data belongs to current user
      if (parsedData && parsedData._userId !== user?.id) {
        console.warn('🚨 Auto-save data contamination detected - clearing invalid entry:', key);
        localStorage.removeItem(userKey);
        return null;
      }
      
      // Remove the userId metadata before returning
      const { _userId, ...cleanData } = parsedData || {};
      return cleanData;
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
      return null;
    }
  };

  // Save data to localStorage
  useEffect(() => {
    if (!enabled || initialLoad.current || !user?.id) {
      initialLoad.current = false;
      return;
    }

    const userKey = getUserSpecificKey(key);
    if (!userKey) return;

    try {
      // Add user ID metadata to ensure data isolation
      const dataWithUserId = {
        ...debouncedData,
        _userId: user.id
      };
      localStorage.setItem(userKey, JSON.stringify(dataWithUserId));
      console.log(`Auto-saved form data for ${key} (user: ${user.id})`);
    } catch (error) {
      console.warn('Failed to auto-save data:', error);
    }
  }, [debouncedData, key, enabled, user?.id]);

  // Clear saved data
  const clearSavedData = () => {
    const userKey = getUserSpecificKey(key);
    if (!userKey) return;

    try {
      localStorage.removeItem(userKey);
    } catch (error) {
      console.warn('Failed to clear auto-saved data:', error);
    }
  };

  // Clear all auto-save data for current user
  const clearAllUserAutoSaveData = () => {
    if (!user?.id) return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`autosave_`) && key.endsWith(`_${user.id}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} auto-save entries for user ${user.id}`);
    } catch (error) {
      console.warn('Failed to clear user auto-save data:', error);
    }
  };

  return {
    loadSavedData,
    clearSavedData,
    clearAllUserAutoSaveData,
  };
};