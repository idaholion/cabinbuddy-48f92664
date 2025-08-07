import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useToast } from '@/hooks/use-toast';

export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
export type PaymentType = 'reservation_deposit' | 'reservation_balance' | 'full_payment' | 'cleaning_fee' | 'damage_deposit' | 'pet_fee' | 'late_fee' | 'refund' | 'other';
export type PaymentMethod = 'cash' | 'check' | 'venmo' | 'paypal' | 'bank_transfer' | 'stripe' | 'other';

export interface Payment {
  id: string;
  organization_id: string;
  reservation_id?: string;
  family_group: string;
  payment_type: PaymentType;
  amount: number;
  amount_paid: number;
  status: PaymentStatus;
  due_date?: string;
  paid_date?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  description?: string;
  notes?: string;
  balance_due: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  family_group: string;
  payment_type: PaymentType;
  amount: number;
  reservation_id?: string;
  description?: string;
  due_date?: string;
  notes?: string;
}

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchPayments = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: CreatePaymentData) => {
    if (!organization?.id) return null;

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          ...paymentData,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment record created successfully",
      });

      fetchPayments(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to create payment record",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePayment = async (id: string, updates: Partial<Omit<Payment, 'id' | 'organization_id' | 'created_at' | 'balance_due'>>) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment updated successfully",
      });

      fetchPayments(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
      return null;
    }
  };

  const recordPayment = async (id: string, amountPaid: number, paymentMethod?: PaymentMethod, paymentReference?: string) => {
    try {
      const payment = payments.find(p => p.id === id);
      if (!payment) throw new Error('Payment not found');

      const newAmountPaid = (payment.amount_paid || 0) + amountPaid;
      
      const { data, error } = await supabase
        .from('payments')
        .update({
          amount_paid: newAmountPaid,
          payment_method: paymentMethod || payment.payment_method,
          payment_reference: paymentReference || payment.payment_reference,
          paid_date: newAmountPaid >= payment.amount ? new Date().toISOString().split('T')[0] : payment.paid_date,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment of $${amountPaid.toFixed(2)} recorded successfully`,
      });

      fetchPayments(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
      return null;
    }
  };

  const createReservationPayment = async (reservationId: string, splitDeposit = false, depositPercentage = 50) => {
    try {
      const { data, error } = await supabase.rpc('create_reservation_payment', {
        p_reservation_id: reservationId,
        p_split_deposit: splitDeposit,
        p_deposit_percentage: depositPercentage
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment records created for reservation",
      });

      fetchPayments(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error creating reservation payment:', error);
      toast({
        title: "Error",
        description: "Failed to create reservation payment records",
        variant: "destructive",
      });
      return null;
    }
  };

  // Get payments summary
  const getPaymentsSummary = () => {
    const summary = {
      total: payments.length,
      pending: payments.filter(p => p.status === 'pending').length,
      paid: payments.filter(p => p.status === 'paid').length,
      overdue: payments.filter(p => p.status === 'overdue').length,
      partial: payments.filter(p => p.status === 'partial').length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      totalPaid: payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0),
      totalOutstanding: payments.reduce((sum, p) => sum + p.balance_due, 0),
    };

    return summary;
  };

  // Get overdue payments
  const getOverduePayments = () => {
    const today = new Date().toISOString().split('T')[0];
    return payments.filter(p => 
      p.due_date && 
      p.due_date < today && 
      p.status !== 'paid' && 
      p.status !== 'cancelled'
    );
  };

  // Get payments by family group
  const getPaymentsByFamilyGroup = (familyGroup: string) => {
    return payments.filter(p => p.family_group === familyGroup);
  };

  useEffect(() => {
    fetchPayments();
  }, [organization?.id]);

  return {
    payments,
    loading,
    createPayment,
    updatePayment,
    recordPayment,
    createReservationPayment,
    fetchPayments,
    getPaymentsSummary,
    getOverduePayments,
    getPaymentsByFamilyGroup,
  };
};