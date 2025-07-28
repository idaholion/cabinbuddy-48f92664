import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = () => {
  const { toast } = useToast();

  const sendNotification = async (
    type: 'reminder' | 'confirmation' | 'cancellation',
    reservation: {
      id: string;
      family_group_name: string;
      check_in_date: string;
      check_out_date: string;
      guest_email: string;
      guest_name: string;
    },
    days_until?: number
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type,
          reservation,
          days_until
        }
      });

      if (error) {
        console.error('Notification error:', error);
        toast({
          title: "Notification Failed",
          description: `Failed to send ${type} notification: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log('Notification sent successfully:', data);
      toast({
        title: "Notification Sent",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} notification sent successfully`,
      });
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Notification Error",
        description: "An unexpected error occurred while sending the notification",
        variant: "destructive",
      });
      return false;
    }
  };

  const sendConfirmationEmail = async (reservation: any) => {
    return await sendNotification('confirmation', {
      id: reservation.id,
      family_group_name: reservation.family_groups?.name || '',
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      guest_email: reservation.family_groups?.contact_email || '',
      guest_name: reservation.family_groups?.contact_name || '',
    });
  };

  const sendCancellationEmail = async (reservation: any) => {
    return await sendNotification('cancellation', {
      id: reservation.id,
      family_group_name: reservation.family_groups?.name || '',
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      guest_email: reservation.family_groups?.contact_email || '',
      guest_name: reservation.family_groups?.contact_name || '',
    });
  };

  return {
    sendNotification,
    sendConfirmationEmail,
    sendCancellationEmail,
  };
};