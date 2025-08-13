import { useEffect, useState, useCallback } from 'react';

export type ConversationReminder = {
  id: string;
  text: string;
  addedAt: string; // ISO string
  route?: string;
};

const STORAGE_KEY = 'conversation_reminders';

export const useConversationReminders = () => {
  const [reminders, setReminders] = useState<ConversationReminder[]>([]);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConversationReminder[];
        setReminders(parsed);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {
      // Ignore
    }
  }, [reminders]);

  const addReminder = useCallback((text: string, route?: string) => {
    const newItem: ConversationReminder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      route,
      addedAt: new Date().toISOString(),
    };
    setReminders((prev) => [newItem, ...prev]);
    return newItem.id;
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const removeMostRecent = useCallback(() => {
    setReminders((prev) => prev.slice(1));
  }, []);

  const clearReminders = useCallback(() => {
    setReminders([]);
  }, []);

  return {
    reminders,
    addReminder,
    removeReminder,
    removeMostRecent,
    clearReminders,
  };
};
