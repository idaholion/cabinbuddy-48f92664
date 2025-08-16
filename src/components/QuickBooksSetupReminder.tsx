import { useEffect } from "react";
import { useConversationReminders } from "@/hooks/useConversationReminders";
import { toast } from "sonner";

export const QuickBooksSetupReminder = () => {
  const { addReminder, reminders } = useConversationReminders();

  useEffect(() => {
    // Check if QuickBooks reminder already exists
    const hasQuickBooksReminder = reminders.some(reminder => 
      reminder.text.toLowerCase().includes('quickbooks client id')
    );

    if (!hasQuickBooksReminder) {
      addReminder(
        "Get QuickBooks Client ID: Register app at developer.intuit.com to obtain Client ID and Client Secret for QuickBooks Online API integration",
        "/financial-dashboard"
      );
      
      toast.success("Added QuickBooks setup reminder to your list");
    }
  }, [addReminder, reminders]);

  return null; // This is a utility component with no UI
};