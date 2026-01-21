import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [receipts, setReceipts] = useState<{ family_group: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const { organizationId, isTestOrganization, getAllocationModel } = useOrganizationContext();
  const { toast } = useToast();

  // Memoize context values to prevent unnecessary re-renders
  const isTest = isTestOrganization();
  const allocationModel = getAllocationModel() || 'rotating_selection';

  // Create organization context for secure queries - only when org is loaded
  // Use useMemo to prevent recreation on every render
  const orgContext = useMemo(() => 
    organizationId ? createOrganizationContext(
      organizationId,
      isTest,
      allocationModel
    ) : null,
    [organizationId, isTest, allocationModel]
  );

  /**
   * Deduplicate payments by reservation+family_group combination.
   * When multiple payment records exist for the same reservation, prioritize:
   * 1. Payment with amount_paid > 0 (actual transaction recorded)
   * 2. Payment with valid daily_occupancy (has guest data)
   * 3. Payment with amount > 0 (has a charge)
   * 4. Most recently created as fallback
   * 
   * Payments without a reservation_id are kept as-is (orphaned/manual payments).
   */
  const deduplicatePayments = (allPayments: Payment[]): Payment[] => {
    // Group payments by reservation_id + family_group
    const grouped = new Map<string, Payment[]>();
    const orphaned: Payment[] = [];
    
    for (const payment of allPayments) {
      if (!payment.reservation_id) {
        // Skip $0 orphaned payments - these are legacy sync artifacts
        if (payment.amount === 0 && (payment.amount_paid || 0) === 0) {
          continue;
        }
        orphaned.push(payment);
        continue;
      }
      
      const key = `${payment.reservation_id}::${payment.family_group}`;
      const existing = grouped.get(key) || [];
      existing.push(payment);
      grouped.set(key, existing);
    }
    
    // For each group, pick the best payment
    const deduplicated: Payment[] = [...orphaned];
    
    for (const [, group] of grouped) {
      if (group.length === 1) {
        deduplicated.push(group[0]);
        continue;
      }
      
      // Sort by priority: amount_paid > 0, then valid occupancy, then amount > 0, then newest
      const sorted = [...group].sort((a, b) => {
        // Priority 1: Has actual payment recorded
        const aHasPayment = (a.amount_paid || 0) > 0;
        const bHasPayment = (b.amount_paid || 0) > 0;
        if (aHasPayment && !bHasPayment) return -1;
        if (!aHasPayment && bHasPayment) return 1;
        
        // Priority 2: Has valid daily_occupancy with guests
        const aAny = a as any;
        const bAny = b as any;
        const aHasOccupancy = aAny.daily_occupancy && Array.isArray(aAny.daily_occupancy) && 
          aAny.daily_occupancy.some((d: any) => d.guests > 0);
        const bHasOccupancy = bAny.daily_occupancy && Array.isArray(bAny.daily_occupancy) && 
          bAny.daily_occupancy.some((d: any) => d.guests > 0);
        if (aHasOccupancy && !bHasOccupancy) return -1;
        if (!aHasOccupancy && bHasOccupancy) return 1;
        
        // Priority 3: Has non-zero amount
        if (a.amount > 0 && b.amount === 0) return -1;
        if (a.amount === 0 && b.amount > 0) return 1;
        
        // Priority 4: Most recent
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      deduplicated.push(sorted[0]);
    }
    
    return deduplicated;
  };

  /**
   * Apply credit cascade: when a family has overpaid on one stay (negative balance),
   * or has receipt credits, apply that credit to other unpaid stays for the same family.
   * This mirrors the Stay History backward payment cascade logic.
   */
  const applyCreditCascade = (payments: Payment[], receiptData: { family_group: string; amount: number }[]): Payment[] => {
    // Calculate total receipts per family
    const receiptsByFamily = new Map<string, number>();
    for (const r of receiptData) {
      const current = receiptsByFamily.get(r.family_group) || 0;
      receiptsByFamily.set(r.family_group, current + r.amount);
    }

    // Group payments by family_group
    const byFamily = new Map<string, Payment[]>();
    for (const p of payments) {
      const family = p.family_group;
      if (!byFamily.has(family)) {
        byFamily.set(family, []);
      }
      byFamily.get(family)!.push(p);
    }

    const result: Payment[] = [];

    for (const [familyGroup, familyPayments] of byFamily) {
      // Sort by reservation date (oldest first) for consistent cascade
      const sorted = [...familyPayments].sort((a, b) => {
        const aDate = a.reservation?.start_date || a.created_at;
        const bDate = b.reservation?.start_date || b.created_at;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });

      // Calculate total credit from overpayments (negative balances)
      let totalCredit = 0;
      for (const p of sorted) {
        if (p.balance_due < 0) {
          totalCredit += Math.abs(p.balance_due);
        }
      }
      
      // Add receipt credits for this family
      const receiptCredit = receiptsByFamily.get(familyGroup) || 0;
      totalCredit += receiptCredit;

      // Apply credit to unpaid balances, oldest first
      let remainingCredit = totalCredit;
      for (const p of sorted) {
        // Correct status based on actual balance_due (fixes stale database status)
        let correctedStatus = p.status;
        if (p.balance_due <= 0 && p.status !== 'paid' && p.status !== 'cancelled' && p.status !== 'refunded') {
          correctedStatus = 'paid';
        } else if (p.balance_due > 0 && p.balance_due < p.amount && (p.amount_paid || 0) > 0 && p.status !== 'partial') {
          correctedStatus = 'partial';
        }

        if (p.balance_due > 0 && remainingCredit > 0) {
          const creditToApply = Math.min(remainingCredit, p.balance_due);
          // Create a modified payment with adjusted balance and status
          const newBalanceDue = p.balance_due - creditToApply;
          const newStatus = newBalanceDue <= 0 ? 'paid' : (p.amount_paid || 0) > 0 ? 'partial' : correctedStatus;
          
          // Determine credit source for the note
          const creditSource = receiptCredit > 0 ? 'receipts/overpayments' : 'overpayment';
          
          result.push({
            ...p,
            balance_due: newBalanceDue,
            status: newStatus as PaymentStatus,
            // Add a note about credit applied (for display purposes)
            notes: creditToApply > 0 
              ? `${p.notes || ''} [Credit of $${creditToApply.toFixed(2)} applied from ${creditSource}]`.trim()
              : p.notes
          });
          remainingCredit -= creditToApply;
        } else if (p.balance_due < 0 && totalCredit > 0) {
          // This is a source of credit - zero out the negative balance since it was distributed
          const creditUsed = Math.min(Math.abs(p.balance_due), totalCredit - remainingCredit + Math.abs(p.balance_due));
          const newBalanceDue = p.balance_due + creditUsed;
          result.push({
            ...p,
            balance_due: newBalanceDue,
            status: correctedStatus as PaymentStatus,
            notes: creditUsed > 0 
              ? `${p.notes || ''} [Credit of $${creditUsed.toFixed(2)} applied to other stays]`.trim()
              : p.notes
          });
        } else {
          // No credit cascade needed, but still apply status correction
          result.push({
            ...p,
            status: correctedStatus as PaymentStatus
          });
        }
      }
    }

    return result;
  };

  const fetchPayments = useCallback(async (page = 1, limit = 50, year?: number) => {
    if (!orgContext) {
      console.log('[usePayments] Skipping fetch - no orgContext');
      return;
    }

    try {
      setLoading(true);

      // Fetch ALL payments with reservation data using secure query
      const [paymentsResult, receiptsResult] = await Promise.all([
        secureSelect('payments', orgContext)
          .select(`
            *,
            reservation:reservations(start_date, end_date)
          `)
          .order('created_at', { ascending: false }),
        secureSelect('receipts', orgContext)
          .select('family_group, amount')
      ]);
      
      if (paymentsResult.error) {
        console.error('[usePayments] Supabase error:', paymentsResult.error);
        throw paymentsResult.error;
      }
      
      const allPayments = paymentsResult.data;
      const receiptData = receiptsResult.data || [];
      
      // Store receipts for reference
      setReceipts(receiptData);
      
      // Validate organization ownership
      if (allPayments) {
        try {
          assertOrganizationOwnership(allPayments, orgContext);
        } catch (ownershipError) {
          console.error('[usePayments] Ownership validation failed:', ownershipError);
          throw ownershipError;
        }
      }
      
      // Deduplicate payments to remove stale/duplicate records
      const deduplicatedPayments = deduplicatePayments(allPayments || []);
      
      // Apply credit cascade to show accurate balances after overpayments and receipt credits are distributed
      const paymentsWithCascade = applyCreditCascade(deduplicatedPayments, receiptData);
      
      // Apply year filter if provided
      let filteredPayments = paymentsWithCascade;
      if (year) {
        filteredPayments = paymentsWithCascade.filter(payment => {
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
      }
      
      setPayments(filteredPayments);
      setPagination({ page: 1, limit: 50, total: filteredPayments.length });
    } catch (error) {
      console.error('[usePayments] Error fetching payments:', error);
      console.error('[usePayments] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        orgContext: orgContext ? 'present' : 'missing',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Error",
        description: `Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      // Auto-calculate due_date if not provided
      let finalPaymentData = { ...paymentData };
      if (!finalPaymentData.due_date && orgContext?.organizationId) {
        const { data: settings } = await supabase
          .from('reservation_settings')
          .select('season_end_month, season_end_day, season_payment_deadline_offset_days')
          .eq('organization_id', orgContext.organizationId)
          .maybeSingle();
        
        if (settings) {
          const currentYear = new Date().getFullYear();
          const seasonEndMonth = settings.season_end_month ?? 10;
          const seasonEndDay = settings.season_end_day ?? 31;
          const offsetDays = settings.season_payment_deadline_offset_days ?? 0;
          
          const dueDate = new Date(currentYear, seasonEndMonth - 1, seasonEndDay);
          dueDate.setDate(dueDate.getDate() + offsetDays);
          finalPaymentData.due_date = dueDate.toISOString().split('T')[0];
        }
      }

      // Use secure insert - organization_id automatically added
      const { data, error } = await secureInsert('payments', finalPaymentData, orgContext)
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
      
      // Calculate new balance and status
      const newBalanceDue = payment.amount - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';
      
      // Use secure update - organization_id filter automatically applied
      const { data, error } = await secureUpdate('payments', {
        amount_paid: newAmountPaid,
        status: newStatus,
        payment_method: paymentMethod || payment.payment_method,
        payment_reference: paymentReference || payment.payment_reference,
        paid_date: newBalanceDue <= 0 ? new Date().toISOString().split('T')[0] : payment.paid_date,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgContext]); // Only depend on orgContext to avoid re-render loops

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