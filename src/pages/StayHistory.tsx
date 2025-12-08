import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, ArrowLeft, Receipt, Edit, FileText, Download, RefreshCw, Trash2, AlertCircle, Send, CreditCard, Calendar as CalendarIcon, Settings, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useReservations } from "@/hooks/useReservations";
import { useReceipts } from "@/hooks/useReceipts";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useUserRole } from "@/hooks/useUserRole";
import { usePayments } from "@/hooks/usePayments";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";
import { getHostFirstName } from "@/lib/reservation-utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UnifiedOccupancyDialog } from "@/components/UnifiedOccupancyDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { PaymentHistoryDialog } from "@/components/PaymentHistoryDialog";
import { ExportSeasonDataDialog } from "@/components/ExportSeasonDataDialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const { claimedProfile } = useProfileClaiming();
  const { organization, loading: orgLoading } = useOrganization();
  const { reservations, loading: reservationsLoading, refetchReservations, deleteReservation } = useReservations();
  const { receipts, loading: receiptsLoading } = useReceipts();
  const { settings: financialSettings, loading: settingsLoading } = useFinancialSettings();
  const { familyGroups } = useFamilyGroups();
  const { isAdmin, isCalendarKeeper, isGroupLead, userFamilyGroup } = useUserRole();
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
      return primaryHost.host_email?.toLowerCase() === user?.email?.toLowerCase();
    }
    
    // Fallback: if no host_assignments, only show if user_id matches (old data)
    return reservation.user_id === user?.id;
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
      return primaryHost.host_email?.toLowerCase() === user.email?.toLowerCase();
    }
    
    // Fallback: if no host_assignments, check user_id (legacy reservations)
    return reservation.user_id === user.id;
  };

  const filteredReservations = reservations
    .filter((reservation) => {
      const checkInDate = parseDateOnly(reservation.start_date);
      const checkOutDate = parseDateOnly(reservation.end_date);
      const isPast = checkOutDate < new Date();
      const isConfirmed = reservation.status === "confirmed";
      const matchesYear = selectedYear === 0 || checkInDate.getFullYear() === selectedYear;
      const matchesFamily = selectedFamilyGroup === "all" || reservation.family_group === selectedFamilyGroup;
      const hasPermission = canViewReservation(reservation);
      
      return isPast && isConfirmed && matchesYear && matchesFamily && hasPermission;
    });

  // Create virtual reservations from payment splits where current user is recipient
  // Admins and Calendar Keepers see all splits, regular users see only their own
  const createVirtualReservationsFromSplits = () => {
    if (!user?.id) return [];
    
    return paymentSplits
      .filter(split => {
        // Admins and Calendar Keepers see all splits in the organization
        if (isAdmin || isCalendarKeeper) {
          // If a specific family group is selected, filter to that group
          if (selectedFamilyGroup !== "all") {
            return split.split_to_family_group === selectedFamilyGroup;
          }
          return true;
        }
        // Regular users only see splits where they are the recipient
        return split.split_to_user_id === user.id;
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
        const endDate = rawDays[rawDays.length - 1]?.date;
        
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
        // Apply same filters as regular reservations
        const checkOutDate = parseDateOnly(virtualRes.end_date);
        const checkInDate = parseDateOnly(virtualRes.start_date);
        const isPast = checkOutDate < new Date();
        const matchesYear = selectedYear === 0 || checkInDate.getFullYear() === selectedYear;
        const matchesFamily = selectedFamilyGroup === "all" || virtualRes.family_group === selectedFamilyGroup;
        
        return isPast && matchesYear && matchesFamily;
      });
  };

  // Merge virtual split reservations with real reservations
  const virtualSplitReservations = createVirtualReservationsFromSplits();
  const allReservations = [...filteredReservations, ...virtualSplitReservations]
    .sort((a, b) => parseDateOnly(b.start_date).getTime() - parseDateOnly(a.start_date).getTime());

  // Track which family groups have had receipts applied (to avoid double-counting)
  const familyGroupsWithReceipts = new Set<string>();

  // Helper function to check if daily occupancy has valid guest data
  const hasValidOccupancyData = (dailyOccupancy: any[]): boolean => {
    if (!dailyOccupancy || dailyOccupancy.length === 0) return false;
    return dailyOccupancy.some(day => (day.guests || 0) > 0);
  };

  const calculateStayData = (reservation: any, previousBalance: number = 0, isNewestInGroup: boolean = false) => {
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
    
    // Only apply receipts to the newest reservation per family group
    let receiptsTotal = 0;
    let receiptsCount = 0;
    
    if (isNewestInGroup && !familyGroupsWithReceipts.has(reservation.family_group)) {
      const stayReceipts = receipts.filter((receipt) => {
        return receipt.family_group === reservation.family_group;
      });
      receiptsTotal = stayReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
      receiptsCount = stayReceipts.length;
      familyGroupsWithReceipts.add(reservation.family_group);
      
      console.log(`[StayHistory] Applied ${receiptsCount} receipts totaling $${receiptsTotal.toFixed(2)} to newest ${reservation.family_group} reservation`);
    }
    
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
  
  // Find the newest reservation for each family group (by check-in date)
  // This will be used to apply receipts to the newest stay
  const newestReservationByFamily = new Map<string, string>();
  
  for (const reservation of sortedReservations) {
    // Keep overwriting so we end up with the newest (last) reservation for each family group
    newestReservationByFamily.set(reservation.family_group, reservation.id);
  }

  // Group reservations by primary host to calculate individual running balances
  const hostBalances = new Map<string, number>();
  
  // Calculate running balance for each reservation based on their primary host
  const reservationsWithBalance: any[] = [];
  
  for (const reservation of sortedReservations) {
    const hostKey = getPrimaryHostKey(reservation);
    const previousBalance = hostBalances.get(hostKey) || 0;
    const isNewestInGroup = newestReservationByFamily.get(reservation.family_group) === reservation.id;
    const stayData = calculateStayData(reservation, previousBalance, isNewestInGroup);
    
    console.log(`[BALANCE DEBUG] Processing: ${reservation.isVirtualSplit ? 'SPLIT' : 'REGULAR'} ${reservation.id}: hostKey=${hostKey}, family=${reservation.family_group}, dates=${reservation.start_date} to ${reservation.end_date}, previousBalance=${previousBalance.toFixed(2)}, currentBalance=${stayData.currentBalance.toFixed(2)}, amountDue=${stayData.amountDue.toFixed(2)}, newRunningTotal=${(previousBalance + stayData.currentBalance).toFixed(2)}`);
    
    reservationsWithBalance.push({ reservation, stayData });
    
    // Update this host's running balance
    hostBalances.set(hostKey, previousBalance + stayData.currentBalance);
  }

  // FORWARD CREDIT CASCADE: Distribute overpayments from older reservations to newer ones
  // Group reservations by primary host (not just family group) to properly track individual balances
  const reservationsByHost = new Map<string, any[]>();
  
  for (const item of reservationsWithBalance) {
    const hostKey = getPrimaryHostKey(item.reservation);
    if (!reservationsByHost.has(hostKey)) {
      reservationsByHost.set(hostKey, []);
    }
    reservationsByHost.get(hostKey)!.push(item);
  }
  
  // For each host, check if any reservation has an overpayment (negative currentBalance)
  for (const [hostKey, hostReservations] of reservationsByHost) {
    // Sort by date (oldest first) to maintain chronological order
    hostReservations.sort((a, b) => 
      parseDateOnly(a.reservation.start_date).getTime() - parseDateOnly(b.reservation.start_date).getTime()
    );
    
    console.log(`[CREDIT CASCADE] Processing ${hostReservations.length} reservations for host ${hostKey}`);
    
    // Check each reservation for overpayment (negative currentBalance), processing oldest first
    for (let i = 0; i < hostReservations.length; i++) {
      const currentItem = hostReservations[i];
      
      // If this reservation has overpayment (paid more than billed for THIS stay)
      if (currentItem.stayData.currentBalance < 0) {
        let remainingCredit = Math.abs(currentItem.stayData.currentBalance);
        const originalCredit = remainingCredit;
        const familyGroup = currentItem.reservation.family_group;
        
        // Track credit distribution from this reservation
        currentItem.stayData.creditDistributedToLaters = 0;
        currentItem.stayData.totalPaymentAmount = currentItem.stayData.amountPaid;
        currentItem.stayData.effectiveAmountPaid = currentItem.stayData.billingAmount;
        
        console.log(`[CREDIT CASCADE] ${familyGroup} reservation on ${currentItem.reservation.start_date} has overpayment of $${remainingCredit.toFixed(2)}`);
        
        // Distribute this credit forward to newer reservations
        // Apply credit to currentBalance (not amountDue) so it cascades through previousBalance chain
        for (let j = i + 1; j < hostReservations.length && remainingCredit > 0; j++) {
          const newerItem = hostReservations[j];
          
          // Apply credit to currentBalance first (the charge for THIS reservation only)
          if (newerItem.stayData.currentBalance > 0) {
            const creditToApply = Math.min(remainingCredit, newerItem.stayData.currentBalance);
            
            console.log(`[CREDIT CASCADE] Applying $${creditToApply.toFixed(2)} credit to ${newerItem.reservation.start_date} currentBalance $${newerItem.stayData.currentBalance.toFixed(2)} (amountDue was $${newerItem.stayData.amountDue.toFixed(2)})`);
            
            // Add credit tracking field
            newerItem.stayData.creditFromEarlierPayment = (newerItem.stayData.creditFromEarlierPayment || 0) + creditToApply;
            
            // Track total credit distributed from the current reservation
            currentItem.stayData.creditDistributedToLaters! += creditToApply;
            
            // Reduce currentBalance by the applied credit
            newerItem.stayData.currentBalance -= creditToApply;
            
            // Reduce remaining credit
            remainingCredit -= creditToApply;
            
            console.log(`[CREDIT CASCADE] After credit: ${newerItem.reservation.start_date} currentBalance=$${newerItem.stayData.currentBalance.toFixed(2)}`);
          }
        }
        
        // "Consume" the distributed credit from the source stay so it doesn't also flow forward as previousBalance
        const creditConsumed = originalCredit - remainingCredit;
        if (creditConsumed > 0) {
          currentItem.stayData.currentBalance += creditConsumed;
          console.log(`[CREDIT CASCADE] Consumed $${creditConsumed.toFixed(2)} from source stay. New currentBalance: $${currentItem.stayData.currentBalance.toFixed(2)}`);
        }
        
        console.log(`[CREDIT CASCADE] Credit cascade complete for ${currentItem.reservation.start_date}. Unused credit: $${remainingCredit.toFixed(2)}`);
      }
    }
    
    // RECALCULATE running balances after credits have been applied
    // This ensures previousBalance flows correctly through the chain
    let runningBalance = 0;
    for (const item of hostReservations) {
      item.stayData.previousBalance = runningBalance;
      item.stayData.amountDue = item.stayData.currentBalance + runningBalance;
      runningBalance += item.stayData.currentBalance;
      
      console.log(`[RECALC] ${item.reservation.start_date}: previousBalance=$${item.stayData.previousBalance.toFixed(2)}, currentBalance=$${item.stayData.currentBalance.toFixed(2)}, amountDue=$${item.stayData.amountDue.toFixed(2)}, runningBalance=$${runningBalance.toFixed(2)}`);
    }
  }
  
  // Display oldest first, newest last
  let displayReservations = [...reservationsWithBalance];
  
  // Identify the last (newest) reservation for each host to only show credit options there
  const lastReservationByHost = new Map<string, string>();
  for (let i = displayReservations.length - 1; i >= 0; i--) {
    const { reservation } = displayReservations[i];
    const hostKey = getPrimaryHostKey(reservation);
    if (!lastReservationByHost.has(hostKey)) {
      lastReservationByHost.set(hostKey, reservation.id);
    }
  }

  // Calculate summary stats (including virtual split reservations)
  const totalStays = allReservations.length;
  const totalNights = allReservations.reduce((sum, res) => {
    if (res.isVirtualSplit) {
      // For virtual splits, count the days in daily occupancy
      return sum + (res.splitData?.dailyOccupancy?.length || 0);
    }
    const nights = differenceInDays(parseDateOnly(res.end_date), parseDateOnly(res.start_date));
    return sum + nights;
  }, 0);
  const totalPaid = allReservations.reduce((sum, res) => {
    const stayData = calculateStayData(res);
    return sum + stayData.amountPaid;
  }, 0);
  
  // Apply backward payment cascade: excess payment on newest stay covers older unpaid stays
  const applyBackwardPaymentCascade = (reservations: typeof displayReservations) => {
    // Group by primary host
    const hostGroups = new Map<string, typeof displayReservations>();
    reservations.forEach(res => {
      const hostKey = getPrimaryHostKey(res.reservation);
      if (!hostGroups.has(hostKey)) {
        hostGroups.set(hostKey, []);
      }
      hostGroups.get(hostKey)!.push(res);
    });

    // For each host group, apply excess credit from newest stay to older stays
    hostGroups.forEach((hostReservations, hostKey) => {
      const newestResId = lastReservationByHost.get(hostKey);
      const newestRes = hostReservations.find(r => r.reservation.id === newestResId);
      
      if (!newestRes) return;
      
      // Calculate excess credit on newest stay using currentBalance (not amountDue)
      // currentBalance = billingAmount - amountPaid, negative means overpayment on THIS stay
      // The running balance already applies this credit, but we want to SHOW it on older stays
      const currentBalance = newestRes.stayData.currentBalance;
      let availableCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0;
      
      console.log(`[BACKWARD CASCADE] Host ${hostKey}: newest stay currentBalance=${currentBalance}, availableCredit=${availableCredit}`);
      
      if (availableCredit > 0) {
        // Sort older stays by date (most recent first, so we pay those first)
        // Check currentBalance > 0 (the billing for THAT stay), not amountDue which includes running balance
        const olderStays = hostReservations
          .filter(r => r.reservation.id !== newestResId && r.stayData.currentBalance > 0)
          .sort((a, b) => parseDateOnly(b.reservation.start_date).getTime() - parseDateOnly(a.reservation.start_date).getTime());
        
        console.log(`[BACKWARD CASCADE] Found ${olderStays.length} older stays with currentBalance > 0`);
        
        let totalCreditDistributed = 0;
        
        for (const res of olderStays) {
          if (availableCredit <= 0) break;
          
          // Apply credit to this stay's currentBalance (its individual charge)
          const amountToApply = Math.min(availableCredit, res.stayData.currentBalance);
          res.stayData.originalAmountDue = res.stayData.currentBalance;
          res.stayData.currentBalance -= amountToApply;
          res.stayData.amountDue -= amountToApply;
          res.stayData.paidViaLaterStay = true;
          availableCredit -= amountToApply;
          totalCreditDistributed += amountToApply;
          
          console.log(`[BACKWARD CASCADE] Applied $${amountToApply} to stay ${res.reservation.start_date}, remaining credit=${availableCredit}`);
        }
        
        // Track how much credit was distributed FROM the newest stay TO older stays
        if (totalCreditDistributed > 0) {
          newestRes.stayData.creditDistributedToOlders = totalCreditDistributed;
          // The "effective" amount paid for THIS stay is the billing amount, rest went to older stays
          newestRes.stayData.effectiveAmountPaid = newestRes.stayData.billingAmount;
          newestRes.stayData.totalPaymentAmount = newestRes.stayData.amountPaid;
          
          // CRITICAL: Adjust the newest stay's currentBalance - the credit was used for older stays
          // currentBalance was negative (overpayment), add back the distributed amount
          newestRes.stayData.currentBalance += totalCreditDistributed;
          
          console.log(`[BACKWARD CASCADE] Newest stay distributed $${totalCreditDistributed} to older stays, adjusted currentBalance to ${newestRes.stayData.currentBalance}`);
        }
      }
      
      // RECALCULATE running balances for this host after backward cascade
      hostReservations.sort((a, b) => 
        parseDateOnly(a.reservation.start_date).getTime() - parseDateOnly(b.reservation.start_date).getTime()
      );
      
      let runningBalance = 0;
      for (const item of hostReservations) {
        item.stayData.previousBalance = runningBalance;
        item.stayData.amountDue = item.stayData.currentBalance + runningBalance;
        runningBalance += item.stayData.currentBalance;
        
        console.log(`[BACKWARD RECALC] ${item.reservation.start_date}: previousBalance=$${item.stayData.previousBalance.toFixed(2)}, currentBalance=$${item.stayData.currentBalance.toFixed(2)}, amountDue=$${item.stayData.amountDue.toFixed(2)}`);
      }
    });

    return reservations;
  };

  // Apply the cascade
  displayReservations = applyBackwardPaymentCascade(displayReservations);
  
  // Calculate current balance (only sum the newest stay's amountDue per host)
  const currentBalance = Array.from(lastReservationByHost.values()).reduce((sum, resId) => {
    const reservationItem = displayReservations.find(r => r.reservation.id === resId);
    if (reservationItem) {
      return sum + reservationItem.stayData.amountDue;
    }
    return sum;
  }, 0);

  // Count orphaned payments (for admin debugging)
  const orphanedPaymentsCount = payments.filter(p => 
    p.reservation_id === null && 
    (p as any).daily_occupancy && 
    Array.isArray((p as any).daily_occupancy) && 
    (p as any).daily_occupancy.length > 0
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
        {displayReservations.map(({ reservation, stayData }) => {
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
                      {stayData.paymentId && (
                        <Badge variant={
                          stayData.billingAmount === 0 && !stayData.hasOccupancyData ? 'secondary' :
                          stayData.amountDue <= 0 ? 'default' : 
                          stayData.amountPaid > 0 && stayData.amountDue > 0 ? 'secondary' : 
                          'destructive'
                        }>
                          {stayData.billingAmount === 0 && !stayData.hasOccupancyData ? 'pending' :
                           stayData.amountDue <= 0 ? 'paid' : 
                           stayData.amountPaid > 0 && stayData.amountDue > 0 ? 'partial' : 
                           'pending'}
                        </Badge>
                      )}
                      {!reservation.isVirtualSplit && paymentSplits.some(split => split.source_payment_id === stayData.paymentId) && (
                        <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                          <Users className="h-3 w-3" />
                          Cost Split
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {stayData.nights} {stayData.nights === 1 ? "night" : "nights"} • {reservation.family_group}
                      {reservation.isVirtualSplit && (
                        <> • Split from: {stayData.sourceFamily}</>
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
                        <div className="flex justify-between text-sm font-semibold border-t pt-2">
                          <span className="text-muted-foreground">Total Amount:</span>
                          <span>${(stayData.billingAmount + stayData.manualAdjustment).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {stayData.receiptsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Receipts/Credits:</span>
                        <span className="font-medium text-green-600">-${stayData.receiptsTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="font-medium">${stayData.amountPaid.toFixed(2)}</span>
                    </div>
                    {stayData.creditDistributedToOlders && stayData.creditDistributedToOlders > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Applied to Earlier Stays:</span>
                        <span className="font-medium text-green-600">-${stayData.creditDistributedToOlders.toFixed(2)}</span>
                      </div>
                    )}
                    {stayData.creditDistributedToLaters && stayData.creditDistributedToLaters > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Payment Made:</span>
                          <span className="font-medium">${(stayData.totalPaymentAmount || stayData.amountPaid).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Credit to Later Stays:</span>
                          <span className="font-medium text-green-600">-${stayData.creditDistributedToLaters.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {stayData.creditFromEarlierPayment && stayData.creditFromEarlierPayment > 0 && stayData.previousBalance >= 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Credit Applied from Earlier Payment:</span>
                        <span className="font-medium text-green-600">-${stayData.creditFromEarlierPayment.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="font-semibold">Amount Due:</span>
                      <span className={`font-bold ${((stayData.creditDistributedToLaters && stayData.creditDistributedToLaters > 0) ? 0 : stayData.amountDue) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        ${(stayData.creditDistributedToLaters && stayData.creditDistributedToLaters > 0 ? 0 : stayData.amountDue).toFixed(2)}
                        {stayData.paidViaLaterStay && stayData.originalAmountDue && (
                          <span className="text-muted-foreground font-normal text-xs ml-2">
                            (orig. ${stayData.originalAmountDue.toFixed(2)} paid at later stay)
                          </span>
                        )}
                      </span>
                    </div>
                    {stayData.creditFromEarlierPayment && stayData.creditFromEarlierPayment > 0 && stayData.currentBalance === 0 && stayData.previousBalance < 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Covered by credit from earlier overpayment (included in previous balance)
                      </p>
                    )}
                    {stayData.creditDistributedToLaters && stayData.creditDistributedToLaters > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment covered this stay plus {Math.floor(stayData.creditDistributedToLaters / stayData.billingAmount)} later stay(s)
                      </p>
                    )}
                  </div>
                </div>

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
                              const venmoUrl = `https://venmo.com/${cleanHandle}?txn=charge&amount=${Math.abs(stayData.amountDue)}&note=${encodeURIComponent('Cabin stay refund request')}`;
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
                              const venmoUrl = `https://venmo.com/${cleanHandle}?txn=pay&amount=${stayData.amountDue}&note=${encodeURIComponent('Cabin stay payment')}`;
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
                        organization_id: reservation.organization_id
                      })}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Occupancy
                    </Button>
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
          onSplitCreated={() => {
            const yearFilter = selectedYear === 0 ? undefined : selectedYear;
            fetchPayments(1, 50, yearFilter);
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
