import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, ArrowLeft, Receipt, Edit, FileText, Download, RefreshCw, Trash2, AlertCircle, Send, CreditCard, Calendar as CalendarIcon, Settings, Wallet, CheckCircle, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useReservations } from "@/hooks/useReservations";
import { useReceipts } from "@/hooks/useReceipts";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useUserRole } from "@/hooks/useUserRole";
import { usePayments } from "@/hooks/usePayments";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, addDays } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";
import { getHostFirstName, getHostFullName } from "@/lib/reservation-utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UnifiedOccupancyDialog } from "@/components/UnifiedOccupancyDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { PaymentHistoryDialog } from "@/components/PaymentHistoryDialog";
import { ExportSeasonDataDialog } from "@/components/ExportSeasonDataDialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ViewAsUserPicker } from "@/components/admin/ViewAsUserPicker";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";

import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileClaiming } from "@/hooks/useProfileClaiming";
import { usePaymentSync } from "@/hooks/usePaymentSync";
import { BillingCalculator } from "@/lib/billing-calculator";


export default function StayHistory() {
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(0); // 0 = All Years
  const [editOccupancyStay, setEditOccupancyStay] = useState<any>(null);
  const [recordPaymentStay, setRecordPaymentStay] = useState<any>(null);
  const [viewPaymentHistory, setViewPaymentHistory] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [venmoConfirmStay, setVenmoConfirmStay] = useState<any>(null);
  

  const { user } = useAuth();
  const effective = useEffectiveUser();
  const effectiveUserId = effective.id ?? user?.id;
  const effectiveUserEmail = effective.email ?? user?.email;
  const { claimedProfile } = useProfileClaiming();
  const { organization, loading: orgLoading } = useOrganization();
  const { reservations, loading: reservationsLoading, refetchReservations, deleteReservation } = useReservations();
  const { receipts, loading: receiptsLoading } = useReceipts();
  const { settings: financialSettings, loading: settingsLoading } = useFinancialSettings();
  const { familyGroups } = useFamilyGroups();
  const { isAdmin, isCalendarKeeper, isGroupLead, userFamilyGroup } = useUserRole();
  const navigate = useNavigate();
  const canDeleteStays = isAdmin || isCalendarKeeper;
  const { payments, fetchPayments } = usePayments();
  const [paymentSplits, setPaymentSplits] = useState<any[]>([]);
  const { syncing, syncPayments } = usePaymentSync();

  const loading = orgLoading || reservationsLoading || receiptsLoading || settingsLoading;

  console.log('[StayHistory] Component state:', {
    organizationId: organization?.id,
    organizationName: organization?.name,
    reservationsCount: reservations.length,
    paymentsCount: payments.length,
    selectedYear,
    selectedFamilyGroup
  });

  // Generate list of years from reservations
  const availableYears = Array.from(
    new Set(
      reservations
        .map(r => parseDateOnly(r.start_date).getFullYear())
        .sort((a, b) => b - a)
    )
  );

  useEffect(() => {
    const yearFilter = selectedYear === 0 ? undefined : selectedYear;
    console.log(`[StayHistory] Fetching payments with year filter:`, yearFilter);
    fetchPayments(1, 50, yearFilter);
    fetchPaymentSplits();
  }, [selectedYear, selectedFamilyGroup, organization?.id]);

  const fetchPaymentSplits = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_splits')
        .select(`
          *,
          split_payment:payments!payment_splits_split_payment_id_fkey(*)
        `)
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      setPaymentSplits(data || []);
    } catch (error) {
      console.error('Error fetching payment splits:', error);
    }
  };

  // Refresh data when page becomes visible (user navigates back to this page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const yearFilter = selectedYear === 0 ? undefined : selectedYear;
        console.log(`[StayHistory] Refreshing data with year filter:`, yearFilter);
        refetchReservations();
        fetchPayments(1, 50, yearFilter);
        fetchPaymentSplits();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPayments, refetchReservations, selectedYear]);

  const handleSync = async () => {
    try {
      const yearFilter = selectedYear === 0 ? undefined : selectedYear;
      await refetchReservations();
      await fetchPayments(1, 50, yearFilter);
      await fetchPaymentSplits();
      toast.success("Data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  };

  const handleLinkOrphanedPayments = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('link_orphaned_payments_to_reservations', {
        p_organization_id: organization.id
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; linked_payments: number; message: string };
      toast.success(result.message || 'Orphaned payments have been linked');
      
      // Refresh all data
      await handleSync();
    } catch (error: any) {
      console.error('Error linking orphaned payments:', error);
      toast.error(error.message || "Failed to link orphaned payments");
    }
  };

  const handleSyncPayments = async () => {
    if (!organization?.id) return;
    
    const currentYear = selectedYear === 0 ? new Date().getFullYear() : selectedYear;
    const result = await syncPayments(organization.id, currentYear);
    
    if (result?.success) {
      await handleSync();
    }
  };


  const handleApplyCreditToFuture = async (paymentId: string, amount: number) => {
    if (!paymentId || !organization?.id) {
      toast.error("Unable to apply credit. Please try again.");
      return;
    }
    
    try {
      // Update payment record to mark credit as applied to future
      const { error } = await supabase
        .from('payments')
        .update({
          credit_applied_to_future: true,
          notes: `Credit of ${BillingCalculator.formatCurrency(Math.abs(amount))} applied to future reservations`
        })
        .eq('id', paymentId);
        
      if (error) throw error;
      
      toast.success(`${BillingCalculator.formatCurrency(Math.abs(amount))} will be deducted from your next season's billing.`);
      
      // Refresh data
      await handleSync();
    } catch (error: any) {
      console.error('Error applying credit:', error);
      toast.error("Failed to apply credit. Please try again.");
    }
  };

  const handleSaveOccupancy = async (updatedOccupancy: any[]) => {
    // The EditOccupancyDialog already handles the save via useDailyOccupancySync
    // We just need to refresh the payments to show the updated amount
    const yearFilter = selectedYear === 0 ? undefined : selectedYear;
    await fetchPayments(1, 50, yearFilter);
    toast.success("Occupancy updated successfully");
    setEditOccupancyStay(null);
  };

  const handleDeleteStay = async (reservationId: string) => {
    try {
      const success = await deleteReservation(reservationId);
      if (success) {
        await fetchPayments();
        await fetchPaymentSplits();
        toast.success("Stay deleted successfully");
      }
    } catch (error) {
      toast.error("Failed to delete stay");
    }
  };

  const handleDeleteSplit = async (paymentId: string) => {
    if (!organization?.id) return;
    
    try {
      // Find the split record associated with this payment
      const split = paymentSplits.find(s => s.split_payment?.id === paymentId);
      if (!split) {
        toast.error("Split record not found");
        return;
      }

      // Delete the split payment (this will cascade to delete the split record due to foreign key)
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

      // Refresh data
      await fetchPayments();
      await fetchPaymentSplits();
      toast.success("Guest split deleted successfully. Note: The original reservation's occupancy numbers have not been updated and must be edited manually if needed.");
    } catch (error: any) {
      console.error('Error deleting split:', error);
      toast.error("Failed to delete guest split");
    }
  };

  // Permission check helper - determines if user can view a specific reservation
  const canViewReservation = (reservation: any): boolean => {
    // Admins and calendar keepers can see everything
    if (isAdmin || isCalendarKeeper) return true;
    
    // Group leads can see all reservations for their family group
    if (isGroupLead && userFamilyGroup?.name === reservation.family_group) return true;
    
    // Regular members can only see reservations where they are the primary host
    if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
      const primaryHost = reservation.host_assignments[0];
      return primaryHost.host_email?.toLowerCase() === effectiveUserEmail?.toLowerCase();
    }
    
    // Fallback: if no host_assignments, only show if user_id matches (old data)
    return reservation.user_id === effectiveUserId;
  };

  // Helper function to check if user owns a reservation (for split costs button)
  const isUserReservationOwner = (reservation: any): boolean => {
    if (!user) return false;
    
    // Admins can split costs on any reservation
    if (isAdmin) return true;
    
    // Family group leads can split costs on their group's reservations
    if (claimedProfile?.member_type === 'group_lead' && 
        claimedProfile?.family_group_name === reservation.family_group) {
      return true;
    }
    
    // Check if user is the primary host via host_assignments (most reliable method)
    if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
      const primaryHost = reservation.host_assignments[0];
      return primaryHost.host_email?.toLowerCase() === effectiveUserEmail?.toLowerCase();
    }
    
    // Fallback: if no host_assignments, check user_id (legacy reservations)
    return reservation.user_id === effectiveUserId;
  };

  // NOTE: Year filter is intentionally NOT applied here. We build the financial
  // cascade over ALL stays (globally) so running balances and receipt attribution
  // are consistent; the year filter is applied at render time only.
  const filteredReservations = reservations
    .filter((reservation) => {
      const checkOutDate = parseDateOnly(reservation.end_date);
      const isPast = checkOutDate < new Date();
      const isConfirmed = reservation.status === "confirmed";
      const matchesFamily = selectedFamilyGroup === "all" || reservation.family_group === selectedFamilyGroup;
      const hasPermission = canViewReservation(reservation);
      
      return isPast && isConfirmed && matchesFamily && hasPermission;
    });

  // Create virtual reservations from payment splits where current user is recipient
  // Admins and Calendar Keepers see all splits, regular users see only their own
  const createVirtualReservationsFromSplits = () => {
    if (!effectiveUserId) return [];
    
    return paymentSplits
      .filter(split => {
        if (isAdmin || isCalendarKeeper) {
          if (selectedFamilyGroup !== "all") {
            return split.split_to_family_group === selectedFamilyGroup;
          }
          return true;
        }
        return split.split_to_user_id === effectiveUserId;
      })
      .filter(split => 
        split.daily_occupancy_split && 
        Array.isArray(split.daily_occupancy_split) &&
        split.daily_occupancy_split.length > 0 &&
        split.split_payment
      )
      .map(split => {
        const rawDays = split.daily_occupancy_split;
        const startDate = rawDays[0]?.date;
        // CRITICAL: endDate from daily_occupancy_split is the LAST NIGHT, not checkout date
        // Add 1 day to make it consistent with regular reservations (checkout = day after last night)
        const lastNightDate = rawDays[rawDays.length - 1]?.date;
        const endDate = lastNightDate ? format(addDays(parseDateOnly(lastNightDate), 1), 'yyyy-MM-dd') : lastNightDate;
        
        // Transform daily_occupancy_split to expected format with 'guests' property
        // The new format has sourceGuests/recipientGuests, old format has guests/cost
        const transformedDays = rawDays.map((day: any) => {
          // Check if it's new format (has recipientGuests) or old format (has guests)
          const isNewFormat = day.recipientGuests !== undefined || day.sourceGuests !== undefined;
          
          return {
            date: day.date,
            guests: isNewFormat ? (day.recipientGuests || 0) : (day.guests || 0),
            cost: isNewFormat ? (day.recipientCost || 0) : (day.cost || 0),
            // Keep original data for reference
            sourceGuests: day.sourceGuests,
            recipientGuests: day.recipientGuests,
            perDiem: day.perDiem
          };
        });
        
        return {
          id: `split-${split.id}`,
          start_date: startDate,
          end_date: endDate,
          family_group: split.split_to_family_group,
          status: 'confirmed',
          user_id: split.split_to_user_id,
          organization_id: organization?.id,
          isVirtualSplit: true,
          splitData: {
            splitId: split.id,
            sourceFamily: split.source_family_group,
            payment: split.split_payment,
            dailyOccupancy: transformedDays
          }
        };
      })
      .filter(virtualRes => {
        // Apply same filters as regular reservations (year filter applied later at render)
        const checkOutDate = parseDateOnly(virtualRes.end_date);
        const isPast = checkOutDate < new Date();
        const matchesFamily = selectedFamilyGroup === "all" || virtualRes.family_group === selectedFamilyGroup;
        
        return isPast && matchesFamily;
      });
  };

  // Merge virtual split reservations with real reservations
  const virtualSplitReservations = createVirtualReservationsFromSplits();
  const allReservations = [...filteredReservations, ...virtualSplitReservations]
    .sort((a, b) => parseDateOnly(b.start_date).getTime() - parseDateOnly(a.start_date).getTime());

  // Chronological receipt attribution: for each family group, walk stays oldest-first
  // and assign each receipt to the FIRST stay whose end date is on/after the receipt date.
  // Receipts dated after the family's most recent completed stay attach to that final stay
  // as "received since last stay". Result: Map<reservationId, { total, count }>.
  const receiptsByReservation = new Map<string, { total: number; count: number }>();
  {
    const staysByFamily = new Map<string, any[]>();
    for (const r of [...filteredReservations, ...virtualSplitReservations]) {
      if (!r.family_group) continue;
      if (!staysByFamily.has(r.family_group)) staysByFamily.set(r.family_group, []);
      staysByFamily.get(r.family_group)!.push(r);
    }
    for (const [family, stays] of staysByFamily) {
      stays.sort((a, b) => parseDateOnly(a.end_date).getTime() - parseDateOnly(b.end_date).getTime());
      const famReceipts = receipts
        .filter(rc => rc.family_group === family && rc.date)
        .slice()
        .sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime());
      const lastStay = stays[stays.length - 1];
      for (const rc of famReceipts) {
        const rcDate = parseDateOnly(rc.date);
        const target = stays.find(s => parseDateOnly(s.end_date).getTime() >= rcDate.getTime()) || lastStay;
        if (!target) continue;
        const entry = receiptsByReservation.get(target.id) || { total: 0, count: 0 };
        entry.total += Number(rc.amount) || 0;
        entry.count += 1;
        receiptsByReservation.set(target.id, entry);
      }
    }
  }

  // Helper function to check if daily occupancy has valid guest data
  const hasValidOccupancyData = (dailyOccupancy: any[]): boolean => {
    if (!dailyOccupancy || dailyOccupancy.length === 0) return false;
    return dailyOccupancy.some(day => (day.guests || 0) > 0);
  };

  const calculateStayData = (reservation: any, previousBalance: number = 0) => {
    // Handle virtual split reservations
    if (reservation.isVirtualSplit) {
      const splitPayment = reservation.splitData.payment;
      const days = reservation.splitData.dailyOccupancy;
      
      return {
        nights: days.length,
        receiptsTotal: 0,
        receiptsCount: 0,
        billingAmount: Number(splitPayment.amount) || 0,
        amountPaid: Number(splitPayment.amount_paid) || 0,
        currentBalance: Number(splitPayment.balance_due) || 0,
        previousBalance: previousBalance,
        amountDue: (Number(splitPayment.balance_due) || 0) + previousBalance,
        billingMethod: "Guest cost split",
        paymentId: splitPayment.id,
        paymentStatus: splitPayment.status,
        dailyOccupancy: days,
        manualAdjustment: 0,
        adjustmentNotes: null,
        billingLocked: false,
        isVirtualSplit: true,
        sourceFamily: reservation.splitData.sourceFamily,
        creditAppliedToFuture: (splitPayment as any).credit_applied_to_future || false,
        hasOccupancyData: hasValidOccupancyData(days)
      };
    }
    
    const checkInDate = parseDateOnly(reservation.start_date);
    const checkOutDate = parseDateOnly(reservation.end_date);
    const nights = differenceInDays(checkOutDate, checkInDate);
    
    // Find payment record for this reservation with detailed logging
    console.log(`[StayHistory] Finding payment for reservation:`, {
      reservationId: reservation.id,
      familyGroup: reservation.family_group,
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0]
    });
    
    // Match payment by both reservation_id AND family_group for split reservations
    // CRITICAL FIX: Find ALL matching payments and prioritize ones with actual occupancy data
    // This handles the case where duplicate payments were created (one with data, one zeroed out)
    const matchingPayments = payments.filter(p => 
      p.reservation_id === reservation.id && 
      p.family_group === reservation.family_group
    );
    
    let payment;
    if (matchingPayments.length > 1) {
      // Multiple duplicate payments exist - we need to MERGE data from them
      // One may have amount_paid, another may have daily_occupancy with actual data
      console.log(`[StayHistory] ⚠️ Found ${matchingPayments.length} duplicate payments for reservation, merging data`);
      
      // Find the payment with actual amount_paid
      const paymentWithAmountPaid = matchingPayments.find(p => (p.amount_paid || 0) > 0);
      
      // Find the payment with valid daily_occupancy
      const paymentWithOccupancy = matchingPayments.find(p => {
        const daily = (p as any).daily_occupancy;
        return daily && Array.isArray(daily) && daily.some((d: any) => (d.guests || 0) > 0);
      });
      
      // Find payment with amount > 0
      const paymentWithAmount = matchingPayments.find(p => (p.amount || 0) > 0);
      
      // Start with the payment that has amount_paid, or fallback
      payment = paymentWithAmountPaid || paymentWithOccupancy || paymentWithAmount || matchingPayments[0];
      
      // MERGE: If selected payment doesn't have good occupancy but another does, merge it
      if (payment && paymentWithOccupancy && payment.id !== paymentWithOccupancy.id) {
        const goodOccupancy = (paymentWithOccupancy as any).daily_occupancy;
        const currentOccupancy = (payment as any).daily_occupancy;
        const currentHasGoodData = currentOccupancy && Array.isArray(currentOccupancy) && 
          currentOccupancy.some((d: any) => (d.guests || 0) > 0);
        
        if (!currentHasGoodData && goodOccupancy) {
          console.log(`[StayHistory] Merging occupancy data from another payment`);
          (payment as any).daily_occupancy = goodOccupancy;
        }
      }
      
      // MERGE: If selected payment has 0 amount but another has amount, use it
      if (payment && paymentWithAmount && (payment.amount || 0) === 0) {
        console.log(`[StayHistory] Merging amount from another payment`);
        payment.amount = paymentWithAmount.amount;
      }
      
      console.log(`[StayHistory] ✓ Merged payment data:`, {
        paymentId: payment.id,
        amount: payment.amount,
        amountPaid: payment.amount_paid,
        hasValidOccupancy: hasValidOccupancyData((payment as any).daily_occupancy || [])
      });
    } else {
      payment = matchingPayments[0];
      
      if (payment) {
        console.log(`[StayHistory] ✓ Found payment by reservation_id:`, {
          paymentId: payment.id,
          amount: payment.amount,
          hasDailyOccupancy: !!(payment as any).daily_occupancy
        });
      }
    }
    
    // If no payment found by reservation_id, try to find orphaned payments (null reservation_id)
    // that match this reservation's family_group and date range
    if (!payment) {
      const orphanedPayments = payments.filter(p => 
        p.reservation_id === null && 
        p.family_group === reservation.family_group
      );
      
      console.log(`[StayHistory] No direct match. Checking ${orphanedPayments.length} orphaned payments for family group ${reservation.family_group}`);
      
      payment = orphanedPayments.find(p => {
        const paymentAny = p as any;
        
        // Check if payment has daily_occupancy data
        if (!paymentAny.daily_occupancy || !Array.isArray(paymentAny.daily_occupancy)) {
          return false;
        }
        
        // Get payment dates and reservation date range
        const paymentDates = paymentAny.daily_occupancy.map((d: any) => d.date);
        const reservationDates: string[] = [];
        let currentDate = new Date(checkInDate);
        
        while (currentDate < checkOutDate) {
          reservationDates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Check for date overlap - at least 50% of dates must match
        const overlappingDates = reservationDates.filter(date => paymentDates.includes(date));
        const overlapPercentage = overlappingDates.length / reservationDates.length;
        
        console.log(`[StayHistory] Checking payment ${p.id}:`, {
          paymentDates: paymentDates.length,
          reservationDates: reservationDates.length,
          overlapping: overlappingDates.length,
          overlapPercentage: Math.round(overlapPercentage * 100) + '%'
        });
        
        return overlapPercentage >= 0.5; // At least 50% overlap
      });
      
      if (payment) {
        console.log(`[StayHistory] ✓ Found orphaned payment by date overlap:`, {
          paymentId: payment.id,
          amount: payment.amount
        });
      } else {
        console.log(`[StayHistory] ✗ No matching payment found for reservation ${reservation.id}`);
      }
    }
    
    // Receipts attributed to this stay by date-based walk (see receiptsByReservation above)
    const attributed = receiptsByReservation.get(reservation.id);
    const receiptsTotal = attributed?.total || 0;
    const receiptsCount = attributed?.count || 0;
    
    let billingAmount = 0;
    let amountPaid = 0;
    let billingMethod = "Not calculated";
    let dailyOccupancy: any[] = [];
    let manualAdjustment = 0;

    if (payment) {
      billingAmount = Number(payment.amount) || 0;
      amountPaid = Number(payment.amount_paid) || 0;
      // Cast to any to access potential extra fields
      const paymentAny = payment as any;
      dailyOccupancy = paymentAny.daily_occupancy || [];
      manualAdjustment = paymentAny.manual_adjustment_amount || 0;
      billingMethod = dailyOccupancy.length > 0 
        ? "Daily occupancy" 
        : "Session-based";
    }

    // Include manual adjustment in balance calculation
    const currentBalance = (billingAmount + manualAdjustment) - amountPaid - receiptsTotal;
    const amountDue = currentBalance + previousBalance;

    return {
      nights,
      receiptsTotal,
      receiptsCount,
      billingAmount,
      amountPaid,
      currentBalance,
      previousBalance,
      amountDue,
      billingMethod,
      paymentId: payment?.id,
      paymentStatus: payment?.status,
      dailyOccupancy,
      manualAdjustment,
      adjustmentNotes: (payment as any)?.adjustment_notes,
      billingLocked: (payment as any)?.billing_locked,
      creditAppliedToFuture: (payment as any)?.credit_applied_to_future || false,
      hasOccupancyData: hasValidOccupancyData(dailyOccupancy)
    };
  };

  // Sort reservations chronologically (oldest first) and calculate running balance PER PRIMARY HOST
  const sortedReservations = [...allReservations].sort((a, b) => 
    parseDateOnly(a.start_date).getTime() - parseDateOnly(b.start_date).getTime()
  );
  
  // Helper function to get the primary host identifier for a reservation
  const getPrimaryHostKey = (reservation: any) => {
    // For virtual split reservations, use the user_id (which is set to split_to_user_id)
    if (reservation.isVirtualSplit) {
      const hostKey = reservation.user_id || 'unknown';
      console.log(`[BALANCE DEBUG] Virtual Split ${reservation.id}: hostKey=${hostKey}, family=${reservation.family_group}, dates=${reservation.start_date} to ${reservation.end_date}`);
      return hostKey;
    }
    
    // For host_assignments, use the first host's email as the identifier
    if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
      const primaryHost = reservation.host_assignments[0];
      const hostKey = primaryHost.host_email?.toLowerCase() || primaryHost.host_name || reservation.user_id || 'unknown';
      console.log(`[BALANCE DEBUG] Reservation ${reservation.id}: hostKey=${hostKey}, family=${reservation.family_group}, dates=${reservation.start_date} to ${reservation.end_date}`);
      return hostKey;
    }
    // Fallback to user_id
    console.log(`[BALANCE DEBUG] Reservation ${reservation.id}: using user_id=${reservation.user_id}, family=${reservation.family_group}, dates=${reservation.start_date} to ${reservation.end_date}`);
    return reservation.user_id || 'unknown';
  };
  
  // Simple chronological ledger: for each host, walk stays oldest → newest and
  // let each stay's newBalance = previousBalance + charges - payments - receipts.
  // No forward/backward overpayment cascade — running balance carries forward as-is.
  const hostBalances = new Map<string, number>();
  const reservationsWithBalance: any[] = [];

  for (const reservation of sortedReservations) {
    const hostKey = getPrimaryHostKey(reservation);
    const previousBalance = hostBalances.get(hostKey) || 0;
    const stayData = calculateStayData(reservation, previousBalance);
    // stayData.currentBalance is the *charge* delta for this stay
    // (billing + adjustment - payments - receipts). amountDue already = prev + delta.
    reservationsWithBalance.push({ reservation, stayData });
    hostBalances.set(hostKey, previousBalance + stayData.currentBalance);
  }

  // Full ledger is oldest → newest for display
  const fullLedger = [...reservationsWithBalance];

  // Identify the last (newest) reservation for each host across the FULL ledger
  const lastReservationByHost = new Map<string, string>();
  for (let i = fullLedger.length - 1; i >= 0; i--) {
    const { reservation } = fullLedger[i];
    const hostKey = getPrimaryHostKey(reservation);
    if (!lastReservationByHost.has(hostKey)) {
      lastReservationByHost.set(hostKey, reservation.id);
    }
  }

  // Apply the year filter to display ONLY (math already ran globally).
  const displayReservations = fullLedger.filter(({ reservation }) => {
    if (selectedYear === 0) return true;
    return parseDateOnly(reservation.start_date).getFullYear() === selectedYear;
  });

  // ID of the very last visible row → gets "Current Balance" label instead of "New Balance".
  const lastVisibleId = displayReservations.length > 0
    ? displayReservations[displayReservations.length - 1].reservation.id
    : null;

  // Year-end balances: for each year present in the full ledger, take the running
  // balance across all hosts as of the last stay of that year. Displayed as a
  // divider row between years so the reader can see the rollover explicitly.
  const yearEndBalances = new Map<number, number>();
  {
    const runningByHost = new Map<string, number>();
    // Group by year, in chronological order
    for (const item of fullLedger) {
      const hostKey = getPrimaryHostKey(item.reservation);
      runningByHost.set(hostKey, (runningByHost.get(hostKey) || 0) + item.stayData.currentBalance);
      const year = parseDateOnly(item.reservation.start_date).getFullYear();
      // sum across all hosts snapshot
      let total = 0;
      for (const v of runningByHost.values()) total += v;
      yearEndBalances.set(year, total);
    }
  }

  // Summary stats — apply year filter for display counts, but Current Balance
  // reflects the GLOBAL running balance (sum across hosts) so it doesn't shift
  // when the user narrows the year filter.
  const visibleReservations = displayReservations.map(r => r.reservation);
  const totalStays = visibleReservations.length;
  const totalNights = visibleReservations.reduce((sum, res) => {
    if (res.isVirtualSplit) {
      return sum + (res.splitData?.dailyOccupancy?.length || 0);
    }
    return sum + differenceInDays(parseDateOnly(res.end_date), parseDateOnly(res.start_date));
  }, 0);
  const totalPaid = displayReservations.reduce((sum, r) => sum + (r.stayData.amountPaid || 0), 0);

  // Current balance = sum across hosts of the newest stay's amountDue in the full ledger
  const currentBalance = Array.from(lastReservationByHost.values()).reduce((sum, resId) => {
    const item = fullLedger.find(r => r.reservation.id === resId);
    return item ? sum + item.stayData.amountDue : sum;
  }, 0);



  // Count orphaned payments (for admin debugging)
  // Exclude intentional split payments (reservation_id is null by design)
  const orphanedPaymentsCount = payments.filter(p => 
    p.reservation_id === null && 
    (p as any).daily_occupancy && 
    Array.isArray((p as any).daily_occupancy) && 
    (p as any).daily_occupancy.length > 0 &&
    !(p.notes && p.notes.toLowerCase().includes('split from'))
  ).length;
  
  console.log(`[StayHistory] Summary:`, {
    totalStays,
    totalNights,
    totalPaid,
    orphanedPayments: orphanedPaymentsCount,
    totalPayments: payments.length,
    linkedPayments: payments.filter(p => p.reservation_id !== null).length
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!allReservations || allReservations.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Stay History</h1>
            <p className="text-muted-foreground">View your past cabin stays and related costs</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Year Filter */}
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Family Group Filter (Admin only) */}
            {isAdmin && (
              <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select family group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Family Groups</SelectItem>
                  {familyGroups.map((group) => (
                    <SelectItem key={group.id} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Past Stays Found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedYear === 0 
                    ? "You haven't completed any stays yet. Book your next stay to see it here!"
                    : `No stays found for ${selectedYear}. Try selecting a different year or book your next stay!`
                  }
                </p>
                <Button asChild>
                  <Link to="/calendar">View Calendar</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stay History</h1>
          <p className="text-muted-foreground">
            View and manage your past cabin stays
          </p>
        </div>

        <ViewAsUserPicker scope="stayHistory" />

        <div className="flex flex-wrap gap-3">
          {/* Year Filter */}
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Family Group Filter (Admin only) */}
          {isAdmin && (
            <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select family group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Family Groups</SelectItem>
                {familyGroups.map((group) => (
                  <SelectItem key={group.id} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2 ml-auto">
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/financial-admin-tools">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Tools
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Data
            </Button>
            {isAdmin && (
              <Button 
                variant="default" 
                onClick={handleSyncPayments}
                disabled={syncing}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {syncing ? 'Syncing...' : 'Sync Payments'}
              </Button>
            )}
            {isAdmin && orphanedPaymentsCount > 0 && (
              <Button variant="outline" onClick={handleLinkOrphanedPayments}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Link {orphanedPaymentsCount} Orphaned Payment{orphanedPaymentsCount !== 1 ? 's' : ''}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>


      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stays</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nights</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNights}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 
              currentBalance < 0 ? 'text-green-600 dark:text-green-400' : 
              ''
            }`}>
              {currentBalance < 0 ? '+' : ''}${Math.abs(currentBalance).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Past Stays List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Past Stays</h2>
        {displayReservations.map(({ reservation, stayData }, idx) => {
          const isLastVisible = reservation.id === lastVisibleId;
          const currentYear = parseDateOnly(reservation.start_date).getFullYear();
          const nextItem = displayReservations[idx + 1];
          const nextYear = nextItem ? parseDateOnly(nextItem.reservation.start_date).getFullYear() : null;
          const showYearEnd = nextYear !== null && nextYear !== currentYear;
          const yearEndBal = yearEndBalances.get(currentYear) ?? 0;
          const checkInDate = parseDateOnly(reservation.start_date);
          const checkOutDate = parseDateOnly(reservation.end_date);

          return (
            <Card key={reservation.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {format(checkInDate, "MMM d, yyyy")} - {format(checkOutDate, "MMM d, yyyy")}
                      {reservation.isVirtualSplit && (
                        <Badge variant="outline" className="gap-1 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                          <Users className="h-3 w-3" />
                          Guest Split
                        </Badge>
                      )}
                      {stayData.paymentId && (() => {
                        // Determine if this stay should show as paid based on cascade logic
                        // Check both forward cascade (creditDistributedToLaters) and backward cascade (creditDistributedToOlders)
                        const effectivelyPaid = stayData.amountDue <= 0 || 
                          stayData.paidViaLaterStay || 
                          (stayData.creditDistributedToLaters && stayData.creditDistributedToLaters > 0) ||
                          (stayData.creditDistributedToOlders && stayData.creditDistributedToOlders > 0);
                        
                        return (
                          <Badge variant={
                            stayData.billingAmount === 0 && !stayData.hasOccupancyData ? 'secondary' :
                            effectivelyPaid ? 'default' : 
                            stayData.amountPaid > 0 && stayData.amountDue > 0 ? 'secondary' : 
                            'destructive'
                          }>
                            {stayData.billingAmount === 0 && !stayData.hasOccupancyData ? 'pending' :
                             effectivelyPaid ? 'paid' : 
                             stayData.amountPaid > 0 && stayData.amountDue > 0 ? 'partial' : 
                             'pending'}
                          </Badge>
                        );
                      })()}
                      {!reservation.isVirtualSplit && paymentSplits.some(split => split.source_payment_id === stayData.paymentId) && (
                        <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                          <Users className="h-3 w-3" />
                          Cost Split
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {stayData.nights} {stayData.nights === 1 ? "night" : "nights"}
                      {reservation.isVirtualSplit && (
                        <> • {reservation.splitData?.payment?.notes || `Split from ${stayData.sourceFamily}`}</>
                      )}
                      {!reservation.isVirtualSplit && (
                        <> • {reservation.family_group}</>
                      )}
                      {reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0 && (
                        <> • Reserved by: {getHostFirstName(reservation)}</>
                      )}
                    </CardDescription>
                  </div>
                  <Link to={`/calendar?date=${reservation.start_date}`}>
                    <Button variant="ghost" size="sm">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Left Column - Stay Details */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Billing Method</div>
                      <div className="text-sm">{stayData.billingMethod}</div>
                    </div>
                    {stayData.dailyOccupancy && stayData.dailyOccupancy.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Daily Occupancy</div>
                        <div className="text-sm">
                          {!stayData.hasOccupancyData ? (
                            <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              No guest counts entered
                            </span>
                          ) : (
                            `${stayData.dailyOccupancy.reduce((sum: number, day: any) => sum + (day.guests || 0), 0)} total guest-nights`
                          )}
                        </div>
                      </div>
                    )}
                    {stayData.receiptsCount > 0 && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Receipts Submitted</div>
                        <div className="text-sm">
                          {stayData.receiptsCount} receipt{stayData.receiptsCount !== 1 ? "s" : ""} • ${stayData.receiptsTotal.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Financial Summary */}
                  <div className="space-y-2">
                    {/* Credit Applied to Future Badge */}
                    {stayData.creditAppliedToFuture && stayData.amountDue < 0 && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border-green-300 dark:border-green-700">
                            Credit Applied to Future
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ${Math.abs(stayData.amountDue).toFixed(2)} credit will be applied to your next season's billing
                        </p>
                      </div>
                    )}
                    
                    {stayData.previousBalance !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Previous Balance:</span>
                        <span className={`font-medium ${stayData.previousBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          ${stayData.previousBalance.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Calculated Amount:</span>
                      <span className="font-medium">${stayData.billingAmount.toFixed(2)}</span>
                    </div>
                            {stayData.manualAdjustment !== 0 && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Manual Adjustment:</span>
                                  <span className={`font-medium ${stayData.manualAdjustment > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {stayData.manualAdjustment > 0 ? '+' : ''}${stayData.manualAdjustment.toFixed(2)}
                                  </span>
                                </div>
                                {stayData.adjustmentNotes && (
                                  <div className="text-sm text-muted-foreground italic pl-2 border-l-2 border-muted">
                                    {stayData.adjustmentNotes}
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                          <span className="text-muted-foreground">Total Amount:</span>
                          <span>${(stayData.billingAmount + stayData.manualAdjustment).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {/* Payments (money) — always show when non-zero */}
                    {stayData.amountPaid > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payments (cash / check / venmo):</span>
                        <span className="font-medium">${stayData.amountPaid.toFixed(2)}</span>
                      </div>
                    )}
                    {/* Receipts credited — separate line, clearly labeled */}
                    {stayData.receiptsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Receipts Credited{stayData.receiptsCount > 0 ? ` (${stayData.receiptsCount})` : ''}:
                        </span>
                        <span className="font-medium text-green-600">-${stayData.receiptsTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {/* Show a $0 payments line only if nothing at all was paid/credited, so the card isn't blank */}
                    {stayData.amountPaid === 0 && stayData.receiptsTotal === 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <span className="font-medium">$0.00</span>
                      </div>
                    )}
                    {stayData.creditDistributedToOlders && stayData.creditDistributedToOlders > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Applied to Earlier Stays:</span>
                        <span className="font-medium text-green-600">-${stayData.creditDistributedToOlders.toFixed(2)}</span>
                      </div>
                    )}
                    {(() => {
                      const distributedForward = stayData.creditDistributedToLaters || 0;
                      // Any overpayment left AFTER forward consumption stays on currentBalance as a negative.
                      const rolledForward = distributedForward > 0 && stayData.currentBalance < 0
                        ? Math.abs(stayData.currentBalance)
                        : 0;
                      const totalOverpayment = distributedForward + rolledForward;
                      if (distributedForward <= 0) return null;
                      return (
                        <>
                          {rolledForward > 0 ? (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Applied to next stay:</span>
                                <span className="font-medium text-green-600">-${distributedForward.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Rolled forward as credit:</span>
                                <span className="font-medium text-green-600">-${rolledForward.toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground italic">
                                ${totalOverpayment.toFixed(2)} total overpayment
                              </p>
                            </>
                          ) : (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Credit to Later Stays:</span>
                              <span className="font-medium text-green-600">-${distributedForward.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {stayData.creditFromEarlierPayment && stayData.creditFromEarlierPayment > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Credit Applied from Earlier Payment:</span>
                        <span className="font-medium text-green-600">-${stayData.creditFromEarlierPayment.toFixed(2)}</span>
                      </div>
                    )}
                    {(() => {
                      const displayAmount = (stayData.creditDistributedToLaters && stayData.creditDistributedToLaters > 0) ? 0 : stayData.amountDue;
                      const isCredit = displayAmount < 0;
                      // "Credit Remaining" only for the newest stay per host; otherwise it's still rolling forward.
                      const hostKey = getPrimaryHostKey(reservation);
                      const isNewestForHost = lastReservationByHost.get(hostKey) === reservation.id;
                      const creditLabel = isNewestForHost ? 'Credit Remaining:' : 'Credit Carried Forward:';
                      // Explainer line: incoming credit that fully covered this stay with leftover remaining
                      const incomingCredit = stayData.previousBalance < 0 ? Math.abs(stayData.previousBalance) : 0;
                      const consumedByThisStay = Math.min(incomingCredit, stayData.billingAmount + (stayData.manualAdjustment || 0) - (stayData.receiptsTotal || 0));
                      const leftoverAfterThisStay = incomingCredit - Math.max(0, consumedByThisStay);
                      const showTieLine = isCredit && incomingCredit > 0 && consumedByThisStay > 0 && leftoverAfterThisStay > 0;
                      return (
                        <>
                          <div className="flex justify-between text-sm border-t pt-2">
                            <span className="font-semibold">{isCredit ? creditLabel : 'Amount Due:'}</span>
                            <span className={`font-bold ${displayAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                              ${Math.abs(displayAmount).toFixed(2)}
                              {stayData.paidViaLaterStay && stayData.originalAmountDue && (
                                <span className="text-muted-foreground font-normal text-xs ml-2">
                                  (orig. ${stayData.originalAmountDue.toFixed(2)} paid at later stay)
                                </span>
                              )}
                            </span>
                          </div>
                          {showTieLine && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ${consumedByThisStay.toFixed(2)} of the incoming credit covered this stay; ${leftoverAfterThisStay.toFixed(2)} remains.
                            </p>
                          )}
                        </>
                      );
                    })()}
                    {stayData.creditFromEarlierPayment && stayData.creditFromEarlierPayment > 0 && stayData.currentBalance === 0 && stayData.previousBalance < 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Covered by credit from earlier overpayment (included in previous balance)
                      </p>
                    )}
                    {stayData.creditDistributedToLaters && stayData.creditDistributedToLaters > 0 && stayData.billingAmount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment covered this stay plus {Math.floor(stayData.creditDistributedToLaters / stayData.billingAmount)} later stay(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Credit Applied Confirmation */}
                {stayData.creditAppliedToFuture && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      <h4 className="text-base font-medium">Credit Options</h4>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Credit applied to future reservations
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Venmo Payment Section - Only show on newest stay */}
                {financialSettings?.venmo_handle && stayData.amountDue !== 0 && !stayData.creditAppliedToFuture && 
                  lastReservationByHost.get(getPrimaryHostKey(reservation)) === reservation.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <h4 className="text-base font-medium">
                        {stayData.amountDue < 0 ? 'Credit Options' : 'Pay via Venmo'}
                      </h4>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                      {stayData.amountDue < 0 ? (
                        // Negative balance - show credit options
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            You have a credit of ${Math.abs(stayData.amountDue).toFixed(2)}. Choose an option:
                          </p>
                          
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleApplyCreditToFuture(stayData.paymentId, stayData.amountDue)}
                            disabled={!stayData.paymentId}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Apply Credit to Future Reservations
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => {
                              const cleanHandle = financialSettings.venmo_handle.replace('@', '');
                              const venmoUrl = `https://venmo.com/${cleanHandle}?txn=charge&amount=${Math.abs(stayData.amountDue).toFixed(2)}&note=${encodeURIComponent('Cabin stay refund request')}`;
                              window.open(venmoUrl, '_blank');
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Request ${Math.abs(stayData.amountDue).toFixed(2)} Refund via Venmo
                          </Button>
                        </div>
                      ) : (
                        // Positive balance - show pay now button
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-medium">{financialSettings.venmo_handle}</p>
                            <p className="text-sm text-muted-foreground">
                              Amount: ${stayData.amountDue.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const cleanHandle = financialSettings.venmo_handle.replace('@', '');
                              const venmoUrl = `https://venmo.com/${cleanHandle}?txn=pay&amount=${stayData.amountDue.toFixed(2)}&note=${encodeURIComponent('Cabin stay payment')}`;
                              window.open(venmoUrl, '_blank');
                              setVenmoConfirmStay({
                                ...reservation,
                                paymentId: stayData.paymentId,
                                amountDue: stayData.amountDue
                              });
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Pay Now
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  {(isAdmin || isCalendarKeeper || isUserReservationOwner(reservation)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOccupancyStay({
                        startDate: parseDateOnly(reservation.start_date),
                        endDate: parseDateOnly(reservation.end_date),
                        family_group: reservation.family_group,
                        reservationId: reservation.isVirtualSplit ? null : reservation.id,
                        splitId: reservation.isVirtualSplit ? reservation.splitData?.splitId : undefined,
                        splitPaymentId: reservation.isVirtualSplit ? reservation.splitData?.payment?.id : undefined,
                        dailyOccupancy: stayData.dailyOccupancy,
                        paymentId: stayData.paymentId,
                        billingAmount: stayData.billingAmount,
                        user_id: reservation.user_id,
                        organization_id: reservation.organization_id,
                        reservationHolderName: getHostFullName(reservation)
                      })}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Occupancy
                    </Button>
                  )}
                  {isAdmin && reservation.user_id && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/checkout-list?viewAs=${reservation.user_id}`)}
                        title="Open the Daily Checkout list as if you were this user"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Daily Checkout as user
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/checkout-final?viewAs=${reservation.user_id}`)}
                        title="Open the Final Checkout page as if you were this user"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Final Checkout as user
                      </Button>
                    </>
                  )}
                  {stayData.paymentId && stayData.amountDue > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecordPaymentStay({
                        ...reservation,
                          paymentId: stayData.paymentId,
                          amountDue: stayData.amountDue
                        })}
                       >
                         <DollarSign className="h-4 w-4 mr-2" />
                         Record Payment
                       </Button>
                     )}
                   {stayData.paymentId && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setViewPaymentHistory({
                         paymentId: stayData.paymentId,
                         familyGroup: reservation.family_group,
                         totalAmount: stayData.billingAmount + stayData.manualAdjustment
                       })}
                     >
                       <Receipt className="h-4 w-4 mr-2" />
                       Payment History
                     </Button>
                   )}
                   {canDeleteStays && (
                     <ConfirmationDialog
                       title={reservation.isVirtualSplit ? "Delete Guest Split" : "Delete Stay"}
                       description={
                         reservation.isVirtualSplit 
                           ? "Are you sure you want to delete this guest split? This will remove the split payment record and the source payment. Note: The original reservation's occupancy numbers will not be updated and must be edited manually if needed. This action cannot be undone."
                           : "Are you sure you want to delete this stay? This will remove the reservation and all associated payment records. This action cannot be undone."
                       }
                       confirmText="Delete"
                       cancelText="Cancel"
                       variant="destructive"
                       onConfirm={() => reservation.isVirtualSplit ? handleDeleteSplit(stayData.paymentId!) : handleDeleteStay(reservation.id)}
                     >
                       <Button variant="destructive" size="sm">
                         <Trash2 className="h-4 w-4 mr-2" />
                         {reservation.isVirtualSplit ? "Delete Split" : "Delete Stay"}
                       </Button>
                     </ConfirmationDialog>
                   )}
                 </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <Button asChild variant="outline">
          <Link to="/finance-reports">
            <FileText className="h-4 w-4 mr-2" />
            Financial Dashboard
          </Link>
        </Button>
        <Button asChild>
          <Link to="/calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Book Another Stay
          </Link>
        </Button>
      </div>

      {/* Dialogs */}
      {editOccupancyStay && organization && (
        <UnifiedOccupancyDialog
          open={true}
          onOpenChange={(open) => !open && setEditOccupancyStay(null)}
          stay={editOccupancyStay}
          currentOccupancy={editOccupancyStay.dailyOccupancy || []}
          onSave={handleSaveOccupancy}
          organizationId={organization.id}
          splitId={editOccupancyStay.splitId}
          splitPaymentId={editOccupancyStay.splitPaymentId}
          sourceUserId={user?.id}
          dailyBreakdown={editOccupancyStay.dailyOccupancy?.map((d: any) => ({
            date: d.date,
            guests: d.guests || 0,
            cost: d.cost || 0
          }))}
          totalAmount={editOccupancyStay.billingAmount || 0}
          reservationHolderName={editOccupancyStay.reservationHolderName}
          onSplitCreated={() => {
            const yearFilter = selectedYear === 0 ? undefined : selectedYear;
            fetchPayments(1, 50, yearFilter);
            fetchPaymentSplits();
            refetchReservations();
            setEditOccupancyStay(null);
          }}
        />
      )}

      {recordPaymentStay && (
        <RecordPaymentDialog
          open={true}
          onOpenChange={(open) => !open && setRecordPaymentStay(null)}
          stay={{
            id: recordPaymentStay.paymentId,
            balanceDue: recordPaymentStay.amountDue,
            family_group: recordPaymentStay.family_group
          }}
          onSave={async (paymentData) => {
            if (!recordPaymentStay?.paymentId || !organization?.id) return;
            
            try {
              // Get the current payment details
              const { data: payment, error: fetchError } = await supabase
                .from('payments')
                .select('*')
                .eq('id', recordPaymentStay.paymentId)
                .single();

              if (fetchError) throw fetchError;

              const newAmountPaid = (payment.amount_paid || 0) + paymentData.amount;
              const newBalanceDue = payment.amount - newAmountPaid;

              console.log('[STAY-HISTORY] Recording payment:', {
                paymentId: payment.id,
                currentAmountPaid: payment.amount_paid,
                paymentAmount: paymentData.amount,
                newAmountPaid,
                newBalanceDue
              });

              // Update the payment (balance_due is auto-calculated by database)
              const { error: updateError } = await supabase
                .from('payments')
                .update({
                  amount_paid: newAmountPaid,
                  status: (newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending') as any,
                  payment_method: paymentData.paymentMethod as any,
                  payment_reference: paymentData.paymentReference,
                  paid_date: newBalanceDue <= 0 ? paymentData.paidDate : payment.paid_date,
                  notes: paymentData.notes || payment.notes,
                  updated_by_user_id: user?.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', payment.id);

              console.log('[STAY-HISTORY] Payment update result:', {
                success: !updateError,
                error: updateError
              });

              if (updateError) throw updateError;

              await fetchPayments();
              toast.success("Payment recorded successfully");
              setRecordPaymentStay(null);
            } catch (error: any) {
              console.error('Error recording payment:', error);
              toast.error("Failed to record payment. Please try again.");
              throw error;
            }
          }}
        />
      )}

      {viewPaymentHistory && (
        <PaymentHistoryDialog
          open={!!viewPaymentHistory}
          onOpenChange={(open) => !open && setViewPaymentHistory(null)}
          paymentId={viewPaymentHistory.paymentId}
          familyGroup={viewPaymentHistory.familyGroup}
          totalAmount={viewPaymentHistory.totalAmount}
          onPaymentUpdated={async () => {
            const yearFilter = selectedYear === 0 ? undefined : selectedYear;
            await fetchPayments(1, 50, yearFilter);
          }}
        />
      )}

      {showExportDialog && (
        <ExportSeasonDataDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          seasonData={null}
          year={selectedYear || new Date().getFullYear()}
        />
      )}

      {/* Venmo Payment Confirmation Dialog */}
      <Dialog open={!!venmoConfirmStay} onOpenChange={(open) => !open && setVenmoConfirmStay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Did you complete your Venmo payment?</DialogTitle>
            <DialogDescription>
              We opened Venmo in a new window so you can send ${venmoConfirmStay?.amountDue?.toFixed(2)}. 
              Once you've completed the payment, click "Yes, I've Paid" below to record it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-4">
            <Button variant="outline" onClick={() => setVenmoConfirmStay(null)}>
              Not Yet
            </Button>
            <Button onClick={() => {
              setRecordPaymentStay(venmoConfirmStay);
              setVenmoConfirmStay(null);
            }}>
              Yes, I've Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
