import { useConversationReminders } from '@/hooks/useConversationReminders';

export const addWaveAccessTokenReminder = () => {
  const { addReminder } = useConversationReminders();
  
  const reminderText = "Get Wave access token: Visit Wave Accounting settings, create API credentials, and add the access token to integrate financial data export/import functionality.";
  
  return addReminder(reminderText, '/finance-reports');
};