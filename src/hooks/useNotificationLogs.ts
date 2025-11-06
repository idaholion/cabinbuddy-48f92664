import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface NotificationLog {
  id: string;
  organization_id: string;
  notification_type: string;
  family_group: string;
  reservation_period_id: string;
  sent_at: string;
  email_sent: boolean;
  sms_sent: boolean;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  email_status?: string | null;
  sms_status?: string | null;
  sms_error?: string | null;
  twilio_sid?: string | null;
}

export const useNotificationLogs = (filters?: {
  startDate?: string;
  endDate?: string;
  notificationType?: string;
  familyGroup?: string;
}) => {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["notification-logs", organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from("notification_log")
        .select("*")
        .eq("organization_id", organization.id)
        .order("sent_at", { ascending: false })
        .limit(100);

      if (filters?.startDate) {
        query = query.gte("sent_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("sent_at", filters.endDate);
      }
      if (filters?.notificationType) {
        query = query.eq("notification_type", filters.notificationType);
      }
      if (filters?.familyGroup) {
        query = query.eq("family_group", filters.familyGroup);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });
};
