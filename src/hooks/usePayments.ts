import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useToast } from '@/hooks/use-toast';

export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded' | 'deferred';
export type PaymentType = 'reservation_deposit' | 'reservation_balance' | 'full_payment' | 'cleaning_fee' | 'damage_deposit' | 'pet_fee' | 'late_fee' | 'refund' | 'other' | 'use_fee';
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
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchPayments = useCallback(async (page = 1, limit = 50) => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      
      // Get total count
      const { count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      // Get paginated data
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      
      setPayments(data || []);
      setPagination({ page, limit, total: count || 0 });
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
  }, [organization?.id, toast]);

  const validatePaymentData = (paymentData: CreatePaymentData): string | null => {
    if (!paymentData.family_group.trim()) {
      return "Family group is required";
    }
    if (paymentData.amount <= 0) {
      return "Amount must be greater than zero";
    }
    if (paymentData.amount > 50000) {
      return "Amount cannot exceed $50,000";
    }
    return null;
  };

  const createPayment = async (paymentData: CreatePaymentData) => {
    if (!organization?.id) return null;

    // Validate input
    const validationError = validatePaymentData(paymentData);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return null;
    }

    try {
      // Check for duplicate payments if reservation_id is provided
      if (paymentData.reservation_id) {
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('id, payment_type, amount')
          .eq('organization_id', organization.id)
          .eq('reservation_id', paymentData.reservation_id)
          .eq('payment_type', paymentData.payment_type);

        if (existingPayments && existingPayments.length > 0) {
          toast({
            title: "Duplicate Payment",
            description: `A ${paymentData.payment_type.replace('_', ' ')} payment already exists for this reservation`,
            variant: "destructive",
          });
          return null;
        }
      }

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

      fetchPayments(pagination.page, pagination.limit); // Refresh current page
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
      // Get current payment for optimistic locking
      const { data: currentPayment } = await supabase
        .from('payments')
        .select('updated_at')
        .eq('id', id)
        .single();

      if (!currentPayment) {
        throw new Error('Payment not found');
      }

      const { data, error } = await supabase
        .from('payments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('updated_at', currentPayment.updated_at) // Optimistic locking
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Payment was modified by another user. Please refresh and try again.');
        }
        throw error;
      }

      toast({
        title: "Success",
        description: "Payment updated successfully",
      });

      fetchPayments(pagination.page, pagination.limit); // Refresh current page
      return data;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment",
        variant: "destructive",
      });
      return null;
    }
  };

  const recordPayment = async (id: string, amountPaid: number, paymentMethod?: PaymentMethod, paymentReference?: string) => {
    try {
      const payment = payments.find(p => p.id === id);
      if (!payment) throw new Error('Payment not found');

      // Validation
      if (amountPaid <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const newAmountPaid = (payment.amount_paid || 0) + amountPaid;
      if (newAmountPaid > payment.amount) {
        throw new Error(`Payment amount ($${amountPaid.toFixed(2)}) would exceed total due ($${payment.balance_due.toFixed(2)})`);
      }

      // Get current payment for optimistic locking
      const { data: currentPayment } = await supabase
        .from('payments')
        .select('updated_at, amount_paid')
        .eq('id', id)
        .single();

      if (!currentPayment) {
        throw new Error('Payment not found');
      }

      // Check if payment was modified by another user
      if (currentPayment.amount_paid !== payment.amount_paid) {
        throw new Error('Payment was modified by another user. Please refresh and try again.');
      }
      
      const { data, error } = await supabase
        .from('payments')
        .update({
          amount_paid: newAmountPaid,
          payment_method: paymentMethod || payment.payment_method,
          payment_reference: paymentReference || payment.payment_reference,
          paid_date: newAmountPaid >= payment.amount ? new Date().toISOString().split('T')[0] : payment.paid_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('updated_at', currentPayment.updated_at) // Optimistic locking
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Payment was modified by another user. Please refresh and try again.');
        }
        throw error;
      }

      toast({
        title: "Success",
        description: `Payment of $${amountPaid.toFixed(2)} recorded successfully`,
      });

      fetchPayments(pagination.page, pagination.limit); // Refresh current page
      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment",
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

      fetchPayments(pagination.page, pagination.limit); // Refresh current page
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
  }, [fetchPayments]);

  const recordPartialPayment = async (
    paymentId: string,
    amount: number,
    paidDate: string,
    paymentMethod: string,
    paymentReference?: string,
    notes?: string
  ) => {
    try {
      // Get current payment
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = (payment.amount_paid || 0) + amount;
      const newStatus = newAmountPaid >= payment.amount ? 'paid' : 'partial';

      const { error } = await supabase
        .from('payments')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_date: paidDate,
          payment_method: paymentMethod as any,
          payment_reference: paymentReference,
          notes: notes ? `${payment.notes || ''}\n${notes}`.trim() : payment.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Payment recorded",
        description: `$${amount.toFixed(2)} payment has been recorded.`,
      });

      await fetchPayments();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    payments,
    loading,
    pagination,
    createPayment,
    updatePayment,
    recordPayment,
    createReservationPayment,
    getPaymentsSummary,
    getOverduePayments,
    getPaymentsByFamilyGroup,
    recordPartialPayment,
    fetchPayments,
  };
};