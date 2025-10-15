import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

export interface PaymentSplit {
  id: string;
  source_payment_id: string;
  split_payment_id: string;
  source_user_id: string;
  split_to_user_id: string;
  source_family_group: string;
  split_to_family_group: string;
  daily_occupancy_split: any;
  status: string;
  notification_status: string;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  source_payment?: {
    id: string;
    amount: number;
    description: string;
    created_at: string;
  };
  split_payment?: {
    id: string;
    amount: number;
    amount_paid: number;
    balance_due: number;
    status: string;
    description: string;
    due_date: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    paid_date: string | null;
  };
}

export const usePaymentSplits = () => {
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const fetchSplits = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user is admin
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      const isAdmin = userOrgs?.role === 'admin' || userOrgs?.role === 'treasurer';

      // Build query based on admin status
      let query = supabase
        .from('payment_splits')
        .select(`
          *,
          source_payment:payments!payment_splits_source_payment_id_fkey(
            id,
            amount,
            description,
            created_at
          ),
          split_payment:payments!payment_splits_split_payment_id_fkey(
            id,
            amount,
            amount_paid,
            balance_due,
            status,
            description,
            due_date,
            payment_method,
            payment_reference,
            paid_date
          )
        `)
        .eq('organization_id', organization.id);

      // If not admin, only show splits where user is recipient or source
      if (!isAdmin) {
        query = query.or(`split_to_user_id.eq.${user.id},source_user_id.eq.${user.id}`);
      }

      const { data: splitsData, error: splitsError } = await query
        .order('created_at', { ascending: false });

      if (splitsError) throw splitsError;

      setSplits(splitsData || []);
    } catch (error: any) {
      console.error('Error fetching payment splits:', error);
      toast({
        title: "Error",
        description: "Failed to load guest cost splits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const recordSplitPayment = async (
    splitPaymentId: string,
    amountPaid: number,
    paymentMethod: string,
    paymentReference?: string,
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the current payment details
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', splitPaymentId)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = (payment.amount_paid || 0) + amountPaid;
      const newBalanceDue = payment.amount - newAmountPaid;

      // Update the payment
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending',
          payment_method: paymentMethod as any,
          payment_reference: paymentReference,
          paid_date: newBalanceDue <= 0 ? new Date().toISOString().split('T')[0] : payment.paid_date,
          notes: notes || payment.notes,
          updated_by_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', splitPaymentId);

      if (updateError) throw updateError;

      toast({
        title: "Payment Recorded",
        description: "Guest cost split payment has been recorded successfully.",
      });

      await fetchSplits();
      return true;
    } catch (error: any) {
      console.error('Error recording split payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSplits();
  }, [organization?.id]);

  return {
    splits,
    loading,
    refetch: fetchSplits,
    recordSplitPayment,
  };
};
