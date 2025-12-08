import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SplitDetails {
  id: string;
  source_family_group: string;
  split_to_family_group: string;
  source_user_id: string;
  split_to_user_id: string;
  created_by_user_id: string;
  daily_occupancy_split: any[];
  status: string;
  created_at: string;
  sourceUserEmail?: string;
  recipientUserEmail?: string;
  createdByUserEmail?: string;
  split_payment?: {
    id: string;
    amount: number;
    amount_paid: number;
    balance_due: number;
    status: string;
    description: string;
    due_date: string | null;
  };
}

export const usePaymentSplitDetails = (splitId: string | null) => {
  const [splitDetails, setSplitDetails] = useState<SplitDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (splitId) {
      fetchSplitDetails();
    } else {
      setSplitDetails(null);
    }
  }, [splitId]);

  const fetchSplitDetails = async () => {
    if (!splitId) return;

    try {
      setLoading(true);

      // Fetch the split with payment details
      const { data: split, error: splitError } = await supabase
        .from('payment_splits')
        .select(`
          *,
          split_payment:payments!payment_splits_split_payment_id_fkey(
            id,
            amount,
            amount_paid,
            balance_due,
            status,
            description,
            due_date
          )
        `)
        .eq('id', splitId)
        .single();

      if (splitError) throw splitError;

      console.log('[usePaymentSplitDetails] Raw split data:', split);
      console.log('[usePaymentSplitDetails] daily_occupancy_split:', split.daily_occupancy_split);
      console.log('[usePaymentSplitDetails] is array:', Array.isArray(split.daily_occupancy_split));

      // Fetch user emails from auth metadata
      const userIds = [
        split.source_user_id,
        split.split_to_user_id,
        split.created_by_user_id
      ].filter(Boolean);

      // Get user emails - we'll need to get them from the auth users via a function
      // Since we can't access auth.users directly, we'll fetch via member_profile_links
      // or get current session user info
      const emailMap = new Map<string, string>();
      
      // Try to get emails from the auth system for each user
      for (const userId of userIds) {
        try {
          // Check if this is the current user
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser?.id === userId) {
            emailMap.set(userId, currentUser.email || 'Unknown');
            continue;
          }
          
          // For other users, we'll have to look them up via family groups
          const { data: familyGroups } = await supabase
            .from('family_groups')
            .select('lead_email, host_members')
            .eq('organization_id', split.organization_id);
            
          // Search for the user in family groups
          for (const fg of familyGroups || []) {
            if (fg.lead_email) {
              // We can't directly map user_id to email without auth access
              // Store placeholder for now
              emailMap.set(userId, 'User ' + userId.substring(0, 8));
            }
          }
        } catch (e) {
          console.error('Error fetching user email:', e);
          emailMap.set(userId, 'User ' + userId.substring(0, 8));
        }
      }

      setSplitDetails({
        ...split,
        daily_occupancy_split: Array.isArray(split.daily_occupancy_split) 
          ? split.daily_occupancy_split 
          : [],
        sourceUserEmail: emailMap.get(split.source_user_id) || 'Unknown',
        recipientUserEmail: emailMap.get(split.split_to_user_id) || 'Unknown',
        createdByUserEmail: emailMap.get(split.created_by_user_id) || 'Unknown',
      });
    } catch (error: any) {
      console.error('Error fetching split details:', error);
      toast({
        title: "Error",
        description: "Failed to load split details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    splitDetails,
    loading,
    refetch: fetchSplitDetails,
  };
};
