import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, ArrowLeft, Receipt, Edit, FileText, Download, RefreshCw, Trash2, AlertCircle, Send, CreditCard, Calendar as CalendarIcon, Settings } from "lucide-react";
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
import { EditOccupancyDialog } from "@/components/EditOccupancyDialog";
import { AdjustBillingDialog } from "@/components/AdjustBillingDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { GuestCostSplitDialog } from "@/components/GuestCostSplitDialog";
import { PaymentReceiptDialog } from "@/components/PaymentReceiptDialog";
import { ExportSeasonDataDialog } from "@/components/ExportSeasonDataDialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileClaiming } from "@/hooks/useProfileClaiming";
import { usePaymentSync } from "@/hooks/usePaymentSync";
import { BillingCalculator } from "@/lib/billing-calculator";

export default function StayHistory() {
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(0); // 0 = All Years
  const [editOccupancyStay, setEditOccupancyStay] = useState<any>(null);
  const [adjustBillingStay, setAdjustBillingStay] = useState<any>(null);
  const [recordPaymentStay, setRecordPaymentStay] = useState<any>(null);
  const [splitCostStay, setSplitCostStay] = useState<any>(null);
  const [viewReceiptPayment, setViewReceiptPayment] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  

  const { user } = useAuth();
  const { claimedProfile } = useProfileClaiming();
  const { reservations, loading: reservationsLoading, refetchReservations, deleteReservation } = useReservations();
  const { receipts, loading: receiptsLoading } = useReceipts();
  const { settings: financialSettings, loading: settingsLoading } = useFinancialSettings();
  const { familyGroups } = useFamilyGroups();
  const { isAdmin, isCalendarKeeper, isGroupLead, userFamilyGroup } = useUserRole();
  const canDeleteStays = isAdmin || isCalendarKeeper;
  const { organization } = useOrganization();
  const { payments, fetchPayments } = usePayments();
  const [paymentSplits, setPaymentSplits] = useState<any[]>([]);
  const { syncing, syncPayments } = usePaymentSync();

  const loading = reservationsLoading || receiptsLoading || settingsLoading;

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

  const handleSaveBillingAdjustment = async (data: { manualAdjustment: number; adjustmentNotes: string; billingLocked: boolean }) => {
    if (!adjustBillingStay?.paymentId || !organization?.id) return;
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          manual_adjustment_amount: data.manualAdjustment,
          adjustment_notes: data.adjustmentNotes,
          billing_locked: data.billingLocked
        })
        .eq('id', adjustBillingStay.paymentId)
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      const yearFilter = selectedYear === 0 ? undefined : selectedYear;
      await fetchPayments(1, 50, yearFilter);
      toast.success("Billing adjustment saved successfully");
      setAdjustBillingStay(null);
    } catch (error) {
      toast.error("Failed to save billing adjustment");
      throw error;
    }
  };

  const handleDeleteStay = async (reservationId: string) => {
    try {
      const success = await deleteReservation(reservationId);
      if (success) {
        await fetchPayments();
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
        if (isAdmin || isCalendarKeeper) return true;
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
        const days = split.daily_occupancy_split;
        const startDate = days[0]?.date;
        const endDate = days[days.length - 1]?.date;
        
        return {
          id: `split-${split.id}`,
          start_date: startDate,
          end_date: endDate,
          family_group: split.split_to_family_group,
          status: 'confirmed',
          user_id: split.split_to_user_id, // Use the actual recipient's user_id
          organization_id: organization?.id,
          isVirtualSplit: true,
          splitData: {
            splitId: split.id,
            sourceFamily: split.source_family_group,
            payment: split.split_payment,
            dailyOccupancy: days
          }
        };
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
        previousBalance: 0,
        amountDue: Number(splitPayment.balance_due) || 0,
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
    let payment = payments.find(p => 
      p.reservation_id === reservation.id && 
      p.family_group === reservation.family_group
    );
    
    if (payment) {
      console.log(`[StayHistory] ✓ Found payment by reservation_id:`, {
        paymentId: payment.id,
        amount: payment.amount,
        hasDailyOccupancy: !!(payment as any).daily_occupancy
      });
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
    
    // Only apply receipts to the most recent reservation per family group to avoid double-counting
    let receiptsTotal = 0;
    let receiptsCount = 0;
    
    if (isNewestInGroup && !familyGroupsWithReceipts.has(reservation.family_group)) {
      const stayReceipts = receipts.filter((receipt) => {
        return receipt.family_group === reservation.family_group;
      });
      receiptsTotal = stayReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
      receiptsCount = stayReceipts.length;
      familyGroupsWithReceipts.add(reservation.family_group);
      
      console.log(`[StayHistory] Applied ${receiptsCount} receipts totaling $${receiptsTotal.toFixed(2)} to most recent ${reservation.family_group} reservation`);
    }
    
    let billingAmount = 0;
    let amountPaid = 0;
    let billingMethod = "Not calculated";
    let dailyOccupancy: any[] = [];

    if (payment) {
      billingAmount = Number(payment.amount) || 0;
      amountPaid = Number(payment.amount_paid) || 0;
      // Cast to any to access potential extra fields
      const paymentAny = payment as any;
      dailyOccupancy = paymentAny.daily_occupancy || [];
      billingMethod = dailyOccupancy.length > 0 
        ? "Daily occupancy" 
        : "Session-based";
    }

    const currentBalance = billingAmount - amountPaid - receiptsTotal;
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
      manualAdjustment: (payment as any)?.manual_adjustment_amount || 0,
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
    // For host_assignments, use the first host's email as the identifier
    if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
      const primaryHost = reservation.host_assignments[0];
      const hostKey = primaryHost.host_email?.toLowerCase() || primaryHost.host_name || reservation.user_id || 'unknown';
      console.log(`[BALANCE DEBUG] Reservation ${reservation.id}: hostKey=${hostKey}, dates=${reservation.start_date} to ${reservation.end_date}`);
      return hostKey;
    }
    // Fallback to user_id
    console.log(`[BALANCE DEBUG] Reservation ${reservation.id}: using user_id=${reservation.user_id}, dates=${reservation.start_date} to ${reservation.end_date}`);
    return reservation.user_id || 'unknown';
  };
  
  // Find the most recent reservation for each family group (by check-in date)
  const newestReservationByFamily = new Map<string, string>();
  const sortedByDate = [...sortedReservations].sort((a, b) => 
    parseDateOnly(b.start_date).getTime() - parseDateOnly(a.start_date).getTime()
  );
  
  for (const reservation of sortedByDate) {
    if (!newestReservationByFamily.has(reservation.family_group)) {
      newestReservationByFamily.set(reservation.family_group, reservation.id);
    }
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
    
    console.log(`[BALANCE DEBUG] Reservation ${reservation.id}: hostKey=${hostKey}, previousBalance=${previousBalance.toFixed(2)}, currentBalance=${stayData.currentBalance.toFixed(2)}, amountDue=${stayData.amountDue.toFixed(2)}`);
    
    reservationsWithBalance.push({ reservation, stayData });
    
    // Update this host's running balance
    hostBalances.set(hostKey, previousBalance + stayData.currentBalance);
  }

  // Reverse to show most recent first in the UI
  const displayReservations = [...reservationsWithBalance].reverse();

  // Calculate summary stats
  const totalStays = filteredReservations.length;
  const totalNights = filteredReservations.reduce((sum, res) => {
    const nights = differenceInDays(parseDateOnly(res.end_date), parseDateOnly(res.start_date));
    return sum + nights;
  }, 0);
  const totalPaid = filteredReservations.reduce((sum, res) => {
    const stayData = calculateStayData(res);
    return sum + stayData.amountPaid;
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

  if (!filteredReservations || filteredReservations.length === 0) {
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
      <div className="grid gap-4 md:grid-cols-3">
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
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Manual Adjustment:</span>
                        <span className="font-medium">${stayData.manualAdjustment.toFixed(2)}</span>
                      </div>
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
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="font-semibold">Amount Due:</span>
                      <span className={`font-bold ${stayData.amountDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        ${stayData.amountDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Venmo Payment Section */}
                {financialSettings?.venmo_handle && stayData.amountDue !== 0 && !stayData.creditAppliedToFuture && (
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
                  {!reservation.isVirtualSplit && (isAdmin || isCalendarKeeper || isUserReservationOwner(reservation)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOccupancyStay({
                        startDate: parseDateOnly(reservation.start_date),
                        endDate: parseDateOnly(reservation.end_date),
                        family_group: reservation.family_group,
                        reservationId: reservation.id,
                        dailyOccupancy: stayData.dailyOccupancy
                      })}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Occupancy
                    </Button>
                  )}
                  {!reservation.isVirtualSplit && stayData.paymentId && (isAdmin || isCalendarKeeper || isUserReservationOwner(reservation)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdjustBillingStay({
                        ...reservation,
                        paymentId: stayData.paymentId,
                        calculatedAmount: stayData.billingAmount,
                        manualAdjustment: stayData.manualAdjustment,
                        adjustmentNotes: stayData.adjustmentNotes,
                        billingLocked: stayData.billingLocked
                      })}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Adjust Billing
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
                   {stayData.paymentId && isUserReservationOwner(reservation) && !reservation.isVirtualSplit && stayData.dailyOccupancy && stayData.dailyOccupancy.length > 0 && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setSplitCostStay({
                         ...reservation,
                         paymentId: stayData.paymentId,
                         dailyOccupancy: stayData.dailyOccupancy,
                         billingAmount: stayData.billingAmount,
                         user_id: reservation.user_id,
                         organization_id: reservation.organization_id
                       })}
                     >
                       <Users className="h-4 w-4 mr-2" />
                       Split Costs
                     </Button>
                   )}
                   {stayData.paymentId && stayData.amountPaid > 0 && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setViewReceiptPayment(stayData)}
                     >
                       <Receipt className="h-4 w-4 mr-2" />
                       View Receipt
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
        <EditOccupancyDialog
          open={true}
          onOpenChange={(open) => !open && setEditOccupancyStay(null)}
          stay={editOccupancyStay}
          currentOccupancy={editOccupancyStay.dailyOccupancy || []}
          onSave={handleSaveOccupancy}
          organizationId={organization.id}
        />
      )}

      {adjustBillingStay && (
        <AdjustBillingDialog
          open={true}
          onOpenChange={(open) => !open && setAdjustBillingStay(null)}
          stay={adjustBillingStay}
          onSave={handleSaveBillingAdjustment}
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

              // Update the payment
              const { error: updateError } = await supabase
                .from('payments')
                .update({
                  amount_paid: newAmountPaid,
                  balance_due: newBalanceDue,
                  status: newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending',
                  payment_method: paymentData.paymentMethod as any,
                  payment_reference: paymentData.paymentReference,
                  paid_date: newBalanceDue <= 0 ? paymentData.paidDate : payment.paid_date,
                  notes: paymentData.notes || payment.notes,
                  updated_by_user_id: user?.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', recordPaymentStay.paymentId);

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

      {splitCostStay && splitCostStay.dailyOccupancy && splitCostStay.dailyOccupancy.length > 0 && user && (
        <GuestCostSplitDialog
          open={!!splitCostStay}
          onOpenChange={(open) => !open && setSplitCostStay(null)}
          organizationId={splitCostStay.organization_id}
          reservationId={splitCostStay.id}
          dailyBreakdown={splitCostStay.dailyOccupancy.map((d: any) => ({
            date: d.date,
            guests: d.guests || 0,
            cost: d.cost || 0
          }))}
          totalAmount={splitCostStay.billingAmount || 0}
          sourceUserId={user.id}
          sourceFamilyGroup={splitCostStay.family_group}
          onSplitCreated={() => {
            fetchPayments();
            setSplitCostStay(null);
          }}
        />
      )}

      {viewReceiptPayment && (
        <PaymentReceiptDialog
          open={!!viewReceiptPayment}
          onOpenChange={(open) => !open && setViewReceiptPayment(null)}
          payment={{
            id: viewReceiptPayment.paymentId,
            amount: viewReceiptPayment.billingAmount,
            amount_paid: viewReceiptPayment.amountPaid,
            family_group: viewReceiptPayment.family_group || "",
            description: "Stay payment"
          }}
          isTestMode={false}
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
    </div>
  );
}
