import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from './useOrganizationContext';
import { useToast } from '@/hooks/use-toast';
import {
  secureSelect,
  secureInsert,
  secureUpdate,
  createOrganizationContext,
  assertOrganizationOwnership,
  OrganizationContext
} from '@/lib/secure-queries';

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
  reservation?: {
    start_date: string;
    end_date: string;
  };
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
  const { organizationId, isTestOrganization, getAllocationModel } = useOrganizationContext();
  const { toast } = useToast();

  // Create organization context for secure queries - only when org is loaded
  const orgContext = organizationId ? createOrganizationContext(
    organizationId,
    isTestOrganization(),
    getAllocationModel() || 'rotating_selection'
  ) : null;

  const fetchPayments = useCallback(async (page = 1, limit = 50, year?: number) => {
    if (!orgContext) return;

    try {
      setLoading(true);

      // Apply year filter if provided - filter by reservation dates when available
      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        
        // Fetch ALL payments with reservation data using secure query
        const { data: allPayments, error: allError } = await secureSelect('payments', orgContext)
          .select(`
            *,
            reservation:reservations(start_date, end_date)
          `)
          .order('created_at', { ascending: false });
        
        if (allError) throw allError;
        
        // Validate organization ownership
        if (allPayments) {
          assertOrganizationOwnership(allPayments, orgContext);
        }
        
        // Filter payments by year - prioritize reservation dates over creation dates
        const filteredPayments = (allPayments || []).filter(payment => {
          // If payment has a linked reservation, use reservation start_date
          if (payment.reservation && payment.reservation.start_date) {
            const reservationYear = new Date(payment.reservation.start_date).getFullYear();
            return reservationYear === year;
          }
          
          // For orphaned payments, try to extract year from daily_occupancy dates
          const paymentAny = payment as any;
          if (paymentAny.daily_occupancy && Array.isArray(paymentAny.daily_occupancy) && paymentAny.daily_occupancy.length > 0) {
            const firstOccupancyDate = paymentAny.daily_occupancy[0].date;
            if (firstOccupancyDate) {
              const occupancyYear = new Date(firstOccupancyDate).getFullYear();
              return occupancyYear === year;
            }
          }
          
          // Fallback to payment created_at date
          const paymentYear = new Date(payment.created_at).getFullYear();
          return paymentYear === year;
        });
        
        setPayments(filteredPayments);
        setPagination({ page: 1, limit: 50, total: filteredPayments.length });
        setLoading(false);
        return;
      }

      // When no year filter, fetch ALL payments using secure query
      const { data, error } = await secureSelect('payments', orgContext)
        .select(`
          *,
          reservation:reservations(start_date, end_date)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Validate organization ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }
      
      setPayments(data || []);
      setPagination({ page: 1, limit: 50, total: data?.length || 0 });
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
  }, [orgContext, toast]);

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
    if (!orgContext) return null;

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
      // Check for duplicate payments if reservation_id is provided using secure query
      if (paymentData.reservation_id) {
        const { data: existingPayments } = await secureSelect('payments', orgContext)
          .select('id, payment_type, amount')
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

      // Use secure insert - organization_id automatically added
      const { data, error } = await secureInsert('payments', paymentData, orgContext)
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
    if (!orgContext) return null;

    try {
      // Get current payment for optimistic locking using secure query
      const { data: currentPayment } = await secureSelect('payments', orgContext)
        .select('updated_at')
        .eq('id', id)
        .single();

      if (!currentPayment) {
        throw new Error('Payment not found');
      }

      // Use secure update - organization_id filter automatically applied
      const { data, error } = await secureUpdate('payments', {
        ...updates,
        updated_at: new Date().toISOString()
      }, orgContext)
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
    if (!orgContext) return null;

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

      // Get current payment for optimistic locking using secure query
      const { data: currentPayment } = await secureSelect('payments', orgContext)
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
      
      // Use secure update - organization_id filter automatically applied
      const { data, error } = await secureUpdate('payments', {
        amount_paid: newAmountPaid,
        payment_method: paymentMethod || payment.payment_method,
        payment_reference: paymentReference || payment.payment_reference,
        paid_date: newAmountPaid >= payment.amount ? new Date().toISOString().split('T')[0] : payment.paid_date,
        updated_at: new Date().toISOString()
      }, orgContext)
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
    if (orgContext) {
      fetchPayments();
    }
  }, [fetchPayments, orgContext]);

  const recordPartialPayment = async (
    paymentId: string,
    amount: number,
    paidDate: string,
    paymentMethod: string,
    paymentReference?: string,
    notes?: string
  ) => {
    if (!orgContext) return;

    try {
      // Get current payment using secure query
      const { data: payment, error: fetchError } = await secureSelect('payments', orgContext)
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = (payment.amount_paid || 0) + amount;
      const newStatus = newAmountPaid >= payment.amount ? 'paid' : 'partial';

      // Use secure update - organization_id filter automatically applied
      const { error } = await secureUpdate('payments', {
        amount_paid: newAmountPaid,
        status: newStatus,
        paid_date: paidDate,
        payment_method: paymentMethod as any,
        payment_reference: paymentReference,
        notes: notes ? `${payment.notes || ''}\n${notes}`.trim() : payment.notes,
        updated_at: new Date().toISOString(),
      }, orgContext)
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