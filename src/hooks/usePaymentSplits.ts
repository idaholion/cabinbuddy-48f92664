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
      console.log('[PAYMENT-SPLIT] Starting payment recording:', {
        splitPaymentId,
        amountPaid,
        paymentMethod,
        paymentReference
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[PAYMENT-SPLIT] User not authenticated');
        throw new Error("Not authenticated");
      }

      console.log('[PAYMENT-SPLIT] User authenticated:', user.id);

      // Get the current payment details
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', splitPaymentId)
        .single();

      console.log('[PAYMENT-SPLIT] Payment fetch result:', {
        hasPayment: !!payment,
        error: fetchError,
        currentAmountPaid: payment?.amount_paid,
        totalAmount: payment?.amount
      });

      if (fetchError) {
        console.error('[PAYMENT-SPLIT] Payment fetch error:', fetchError);
        throw fetchError;
      }

      const newAmountPaid = (payment.amount_paid || 0) + amountPaid;
      const newBalanceDue = payment.amount - newAmountPaid;

      console.log('[PAYMENT-SPLIT] Calculated values:', {
        newAmountPaid,
        newBalanceDue,
        newStatus: newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending'
      });

      // Update the payment (balance_due is auto-calculated by database)
      const updateData = {
        amount_paid: newAmountPaid,
        status: (newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending') as any,
        payment_method: paymentMethod as any,
        payment_reference: paymentReference,
        paid_date: newBalanceDue <= 0 ? new Date().toISOString().split('T')[0] : payment.paid_date,
        notes: notes || payment.notes,
        updated_by_user_id: user.id,
        updated_at: new Date().toISOString()
      };

      console.log('[PAYMENT-SPLIT] Update data:', updateData);

      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', splitPaymentId)
        .select();

      console.log('[PAYMENT-SPLIT] Update result:', {
        success: !updateError,
        error: updateError,
        updatedPayment
      });

      if (updateError) {
        console.error('[PAYMENT-SPLIT] Update error:', updateError);
        throw updateError;
      }

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

  const updateSplitOccupancy = async (
    splitId: string,
    sourceOccupancy: { [date: string]: number },
    recipientOccupancy: { [date: string]: number },
    perDiem: number
  ) => {
    try {
      console.log('[PAYMENT-SPLIT] Updating split occupancy:', {
        splitId,
        sourceOccupancy,
        recipientOccupancy,
        perDiem
      });

      const { data, error } = await supabase.functions.invoke('update-split-occupancy', {
        body: {
          splitId,
          sourceOccupancy,
          recipientOccupancy,
          perDiem,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update split occupancy');
      }

      toast({
        title: "Split Updated",
        description: "Guest cost split occupancy has been updated successfully.",
      });

      await fetchSplits();
      return true;
    } catch (error: any) {
      console.error('Error updating split occupancy:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update split. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteSplit = async (splitId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find the split
      const split = splits.find(s => s.id === splitId);
      if (!split) throw new Error("Split not found");

      // Check if recipient has made any payments
      if (split.split_payment && split.split_payment.amount_paid > 0) {
        throw new Error("Cannot delete split after recipient has made payments");
      }

      // Delete the split payment (this will cascade to delete the split record)
      const { error: splitPaymentError } = await supabase
        .from('payments')
        .delete()
        .eq('id', split.split_payment_id);

      if (splitPaymentError) throw splitPaymentError;

      // Delete the source payment
      const { error: sourcePaymentError } = await supabase
        .from('payments')
        .delete()
        .eq('id', split.source_payment_id);

      if (sourcePaymentError) throw sourcePaymentError;

      toast({
        title: "Split Deleted",
        description: "Guest cost split has been deleted successfully. Note: The original reservation's occupancy numbers have not been updated and must be edited manually if needed.",
      });

      await fetchSplits();
      return true;
    } catch (error: any) {
      console.error('Error deleting split:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete split. Please try again.",
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
    updateSplitOccupancy,
    deleteSplit,
  };
};
