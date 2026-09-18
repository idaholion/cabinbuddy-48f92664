import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, ArrowLeft, Receipt, Edit, FileText, Download, RefreshCw, Trash2, AlertCircle, Send, CreditCard, Calendar as CalendarIcon, Settings, Wallet, CheckCircle, Eye, ArrowRightLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useReservations } from "@/hooks/useReservations";
import { useReceipts } from "@/hooks/useReceipts";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";

import { usePayments } from "@/hooks/usePayments";
import { useOrganization } from "@/hooks/useOrganization";
import { useCreditTransfers } from "@/hooks/useCreditTransfers";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, addDays } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";
import { getHostFirstName, getHostFullName } from "@/lib/reservation-utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UnifiedOccupancyDialog } from "@/components/UnifiedOccupancyDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { OtherPaymentOptionsButton } from "@/components/OtherPaymentOptionsButton";
import { TransferCreditDialog } from "@/components/TransferCreditDialog";

import { PaymentHistoryDialog } from "@/components/PaymentHistoryDialog";
import { ExportSeasonDataDialog } from "@/components/ExportSeasonDataDialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ViewAsUserPicker } from "@/components/admin/ViewAsUserPicker";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";

import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileClaiming } from "@/hooks/useProfileClaiming";
import { usePaymentSync } from "@/hooks/usePaymentSync";
import { BillingCalculator } from "@/lib/billing-calculator";


export default function StayHistory() {
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editOccupancyStay, setEditOccupancyStay] = useState<any>(null);
  const [recordPaymentStay, setRecordPaymentStay] = useState<any>(null);
  const [viewPaymentHistory, setViewPaymentHistory] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [venmoConfirmStay, setVenmoConfirmStay] = useState<any>(null);
  // Asked before we open Venmo, so someone who already sent the money
  // records it instead of paying twice.
  const [venmoPrecheckStay, setVenmoPrecheckStay] = useState<any>(null);
  const [recordPaymentDefaultMethod, setRecordPaymentDefaultMethod] = useState<string | undefined>(undefined);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferDialogSourceKey, setTransferDialogSourceKey] = useState<string | null>(null);
  const [transferDialogSourceLabel, setTransferDialogSourceLabel] = useState<string>("");
  const [transferDialogCredit, setTransferDialogCredit] = useState<number>(0);
  // Group leads can look at their whole family's stays or narrow to their own.
  const [leadScope, setLeadScope] = useState<'family' | 'mine'>('family');
  

  const { user } = useAuth();
  const effective = useEffectiveUser();
  const effectiveUserId = effective.id ?? user?.id;
  const effectiveUserEmail = effective.email ?? user?.email;
  const { claimedProfile } = useProfileClaiming();
  const { organization, loading: orgLoading } = useOrganization();
  const { reservations, loading: reservationsLoading, refetchReservations, deleteReservation } = useReservations();
  const { receipts, loading: receiptsLoading } = useReceipts();
  const { settings: financialSettings, paymentMethods, loading: settingsLoading } = useFinancialSettings();
  const { familyGroups } = useFamilyGroups();
  const {
    isAdmin,
    isCalendarKeeper,
    isGroupLead,
    userFamilyGroup,
    isImpersonating,
    canEditStayHistory,
  } = useEffectiveRole();
  const navigate = useNavigate();
  const canDeleteStays = isAdmin || isCalendarKeeper;
  const { payments, fetchPayments } = usePayments();
  const [paymentSplits, setPaymentSplits] = useState<any[]>([]);
  const { syncing, syncPayments } = usePaymentSync();
  const { transfers: creditTransfers, createTransfer, refetchTransfers } = useCreditTransfers();

  const ledgerName = effective.isImpersonated
    ? effective.displayName
    : claimedProfile?.member_name;
  const currentUserLedgerKey = effectiveUserEmail
    ? `p:${effectiveUserEmail.trim().toLowerCase()}`
    : (ledgerName ? `n:${String(ledgerName).trim().toLowerCase()}` : undefined);

  // Group leads may move credit for members of their own group only when the
  // organization has enabled that privilege. Admins always have full rights.
  const leadGroupName = (effective.isImpersonated
    ? effective.familyGroup
    : (typeof userFamilyGroup === 'string' ? userFamilyGroup : (userFamilyGroup as any)?.name))
    || claimedProfile?.family_group_name || undefined;
  const canActForFamilyInStayHistory =
    !isAdmin &&
    !!canEditStayHistory &&
    !!leadGroupName;
  const transferScope: 'own' | 'group' | 'all' = isAdmin
    ? 'all'
    : canActForFamilyInStayHistory
      ? 'group'
      : 'own';

  // ---- Group-lead identity -------------------------------------------------
  // Leads are meant to see every stay in their family group. Lead records are
  // inconsistent across organizations (some have lead_email, some only
  // lead_name, some only the first host member), so resolve all three.
  const sameName = (a?: string | null, b?: string | null) =>
    !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  const identityEmail = (effectiveUserEmail || '').trim().toLowerCase();
  const identityName = String(
    (effective.isImpersonated ? effective.displayName : claimedProfile?.member_name)
      || (user?.user_metadata as any)?.display_name
      || ''
  ).trim().toLowerCase();

  const resolvedLeadGroupName = useMemo(() => {
    if (isAdmin) return undefined;
    const match = (familyGroups || []).find((fg: any) => {
      if (sameName(fg.lead_email, identityEmail)) return true;
      if (sameName(fg.lead_name, identityName)) return true;
      const hosts = Array.isArray(fg.host_members) ? fg.host_members : [];
      const first = hosts[0];
      if (!first) return false;
      const firstName = first.name
        || [first.firstName, first.lastName].filter(Boolean).join(' ');
      return sameName(first.email, identityEmail) || sameName(firstName, identityName);
    });
    return match?.name as string | undefined;
  }, [familyGroups, identityEmail, identityName, isAdmin]);

  const myGroupName = resolvedLeadGroupName
    || (typeof userFamilyGroup === 'string' ? userFamilyGroup : (userFamilyGroup as any)?.name)
    || leadGroupName;
  const isEffectiveLead = !isAdmin && (!!resolvedLeadGroupName || (!!canEditStayHistory && !!myGroupName));
  // Admins viewing one family group get the same My stays / Whole family choice.
  const canChooseScope = isEffectiveLead || (isAdmin && selectedFamilyGroup !== 'all');
  const scopeIsMineOnly = canChooseScope && leadScope === 'mine';


  // While viewing as someone else, the page is locked to their family group.
  // Non-admins are always scoped to their own family group — the permission
  // checkboxes grant access within a family group, never across the whole
  // organization. Only an admin sees "All Family Groups".
  useEffect(() => {
    if (isImpersonating && effective.familyGroup && selectedFamilyGroup !== effective.familyGroup) {
      setSelectedFamilyGroup(effective.familyGroup);
      return;
    }
    if (!isAdmin && myGroupName && selectedFamilyGroup !== myGroupName) {
      setSelectedFamilyGroup(myGroupName);
    }
  }, [isImpersonating, effective.familyGroup, isAdmin, myGroupName]);

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

  // On initial load only, default to current year but fall back to the most
  // recent year with data if the current year has no stays. Never override an
  // explicit user choice (including "All Years", which is 0).
  const hasResolvedInitialYear = useRef(false);
  useEffect(() => {
    if (hasResolvedInitialYear.current) return;
    if (availableYears.length === 0) return;

    hasResolvedInitialYear.current = true;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    fetchPayments(1, 500);
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

  // Map claimed user ids to their member email so split stays (keyed by user id)
  // and regular stays (keyed by host email) resolve to the SAME person.
  const [memberLinks, setMemberLinks] = useState<any[]>([]);

  useEffect(() => {
    const fetchMemberLinks = async () => {
      if (!organization?.id) return;
      const { data, error } = await supabase
        .from('member_profile_links')
        .select('claimed_by_user_id, family_group_name, member_name')
        .eq('organization_id', organization.id);
      if (error) {
        console.error('Error fetching member profile links:', error);
        return;
      }
      setMemberLinks(data || []);
    };
    fetchMemberLinks();
  }, [organization?.id]);

  const userIdToEmail = (() => {
    const nameToEmail = new Map<string, string>();
    for (const group of familyGroups || []) {
      const members = Array.isArray((group as any).host_members) ? (group as any).host_members : [];
      for (const member of members) {
        if (member?.name && member?.email) {
          nameToEmail.set(
            `${String(group.name).trim().toLowerCase()}|${String(member.name).trim().toLowerCase()}`,
            String(member.email).trim().toLowerCase()
          );
        }
      }
    }

    const map = new Map<string, string>();
    for (const link of memberLinks) {
      if (!link.claimed_by_user_id || !link.member_name) continue;
      const email = nameToEmail.get(
        `${String(link.family_group_name || '').trim().toLowerCase()}|${String(link.member_name).trim().toLowerCase()}`
      );
      if (email) map.set(link.claimed_by_user_id, email);
    }
    return map;
  })();

  // Reservation host assignments are historical snapshots, so their email may
  // be stale after a member changes their sign-in address. Resolve the host's
  // current email by family group + member name before using the saved email.
  // This keeps old stays, receipts (which use the stable user id), payments and
  // transfers on one personal ledger after an email change.
  const memberNameToCurrentEmail = (() => {
    const map = new Map<string, string>();
    for (const group of familyGroups || []) {
      const members = Array.isArray((group as any).host_members) ? (group as any).host_members : [];
      for (const member of members) {
        if (!member?.name || !member?.email) continue;
        map.set(
          `${String(group.name).trim().toLowerCase()}|${String(member.name).trim().toLowerCase()}`,
          String(member.email).trim().toLowerCase()
        );
      }
    }
    return map;
  })();

  // Refresh data when page becomes visible (user navigates back to this page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchReservations();
        fetchPayments(1, 500);
        fetchPaymentSplits();
        refetchTransfers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPayments, refetchReservations, selectedYear]);

  const handleSync = async () => {
    try {
      await refetchReservations();
      await fetchPayments(1, 500);
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
    await fetchPayments(1, 500);
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

  // Is this stay personally hosted by the current (or viewed-as) person?
  const isOwnReservation = (reservation: any): boolean => {
    if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
      const primaryHost = reservation.host_assignments[0];
      if (sameName(primaryHost.host_email, identityEmail)) return true;
      if (sameName(primaryHost.host_name, identityName)) return true;
      return false;
    }
    return reservation.user_id === effectiveUserId;
  };

  // Permission check helper - determines if user can view a specific reservation
  const canViewReservation = (reservation: any): boolean => {
    // Admins and calendar keepers can see everything, unless an admin has
    // narrowed a single family group down to their own stays.
    if (isAdmin || isCalendarKeeper) {
      if (isAdmin && scopeIsMineOnly) return isOwnReservation(reservation);
      return true;
    }


    // Group leads can see all reservations for their family group, unless they
    // have narrowed the view to their own stays.
    if (isEffectiveLead && sameName(myGroupName, reservation.family_group)) {
      return leadScope === 'family' ? true : isOwnReservation(reservation);
    }

    // Regular members can only see reservations where they are the primary host
    return isOwnReservation(reservation);
  };

  // Helper function to check if user owns a reservation (for split costs button)
  const isUserReservationOwner = (reservation: any): boolean => {
    if (!user) return false;
    
    // Admins can split costs on any reservation
    if (isAdmin) return true;
    
    // Family group leads (and members with Stay History permission) can split
    // costs on their group's reservations.
    if (canEditStayHistory && leadGroupName === reservation.family_group) {
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
          if (isAdmin && scopeIsMineOnly && split.split_to_user_id !== effectiveUserId) {
            return false;
          }
          if (selectedFamilyGroup !== "all") {
            return split.split_to_family_group === selectedFamilyGroup;
          }
          return true;
        }

        // A group lead's Whole family view must include split stays assigned to
        // another member of that family. My stays remains limited to the viewed
        // person's own split records.
        if (isEffectiveLead && sameName(myGroupName, split.split_to_family_group)) {
          return leadScope === 'family' || split.split_to_user_id === effectiveUserId;
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

  // Helper: ledger identity for a stay. Balances (and credits) belong to a
  // PERSON, not a family group — two members of the same family keep separate
  // running balances. Split stays (keyed by recipient user id) and regular
  // stays (keyed by host email) are resolved to one identity via userIdToEmail.
  const getLedgerKey = (reservation: any) => {
    if (reservation.isVirtualSplit) {
      const email = reservation.user_id ? userIdToEmail.get(reservation.user_id) : undefined;
      if (email) return `p:${email}`;
      if (reservation.user_id) return `u:${reservation.user_id}`;
    } else {
      if (Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
        const primaryHost = reservation.host_assignments[0];
        const currentEmail = primaryHost?.host_name && reservation.family_group
          ? memberNameToCurrentEmail.get(
              `${String(reservation.family_group).trim().toLowerCase()}|${String(primaryHost.host_name).trim().toLowerCase()}`
            )
          : undefined;
        if (currentEmail) return `p:${currentEmail}`;
        const hostEmail = primaryHost?.host_email ? String(primaryHost.host_email).trim().toLowerCase() : '';
        if (hostEmail) return `p:${hostEmail}`;
        if (primaryHost?.host_name) return `n:${String(primaryHost.host_name).trim().toLowerCase()}`;
      }

      const email = reservation.user_id ? userIdToEmail.get(reservation.user_id) : undefined;
      if (email) return `p:${email}`;
      if (reservation.user_id) return `u:${reservation.user_id}`;
    }

    if (reservation.family_group) {
      return `fg:${String(reservation.family_group).trim().toLowerCase()}`;
    }

    return 'unknown';
  };

  // People who host at least one stay in this view. Someone with NO stays keeps
  // a standing credit balance instead (transfers received, receipts submitted).
  const hostKeysWithStays = new Set<string>(allReservations.map(r => getLedgerKey(r)));

  // Ledger key of the person who submitted a receipt (when resolvable).
  const receiptOwnerKey = (rc: any): string | undefined => {
    const email = rc?.user_id ? userIdToEmail.get(rc.user_id) : undefined;
    if (email) return `p:${email}`;
    if (rc?.user_id) return `u:${rc.user_id}`;
    return undefined;
  };

  // Receipts turned in by someone who has no stays of their own become THEIR
  // standing credit rather than reducing the family's next stay.
  const standingReceiptTotals = new Map<string, { total: number; count: number }>();
  const isStandingReceipt = (rc: any) => {
    const key = receiptOwnerKey(rc);
    return !!key && !hostKeysWithStays.has(key);
  };
  for (const rc of receipts) {
    if (!isStandingReceipt(rc)) continue;
    const key = receiptOwnerKey(rc)!;
    const entry = standingReceiptTotals.get(key) || { total: 0, count: 0 };
    entry.total += Number(rc.amount) || 0;
    entry.count += 1;
    standingReceiptTotals.set(key, entry);
  }

  // Chronological receipt attribution: for each family group, walk stays oldest-first
  // and assign each receipt to the FIRST stay whose end date is on/after the receipt date.
  // Receipts dated after the family's most recent completed stay attach to that final stay
  // as "received since last stay". Result: Map<reservationId, { total, count }>.
  const receiptsByReservation = new Map<string, { total: number; count: number }>();
  // Receipts turned in AFTER a person's last stay of a calendar year but still
  // inside that year. They settle on that final stay of the year so the year
  // closes with every receipt accounted for (instead of surfacing unexplained
  // in the following year).
  const yearEndReceiptsByReservation = new Map<string, number>();
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
        .filter(rc => rc.family_group === family && rc.date && !isStandingReceipt(rc))
        .slice()
        .sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime());
      const lastStay = stays[stays.length - 1];
      for (const rc of famReceipts) {
        const rcDate = parseDateOnly(rc.date);
        const rcYear = rcDate.getFullYear();
        const direct = stays.find(s => parseDateOnly(s.end_date).getTime() >= rcDate.getTime());
        let target = direct || lastStay;
        let isYearEnd = false;
        if (!direct || parseDateOnly(direct.end_date).getFullYear() > rcYear) {
          // No remaining stay in the receipt's own year: keep the credit in that
          // year by attaching it to the last stay of that year, when there is one.
          const sameYear = stays.filter(s => parseDateOnly(s.end_date).getFullYear() === rcYear);
          if (sameYear.length) {
            target = sameYear[sameYear.length - 1];
            isYearEnd = true;
          }
        }
        if (!target) continue;
        const entry = receiptsByReservation.get(target.id) || { total: 0, count: 0 };
        entry.total += Number(rc.amount) || 0;
        entry.count += 1;
        receiptsByReservation.set(target.id, entry);
        if (isYearEnd) {
          yearEndReceiptsByReservation.set(
            target.id,
            (yearEndReceiptsByReservation.get(target.id) || 0) + (Number(rc.amount) || 0)
          );
        }
      }
    }
  }

  // Helper function to check if daily occupancy has valid guest data
  const hasValidOccupancyData = (dailyOccupancy: any[]): boolean => {
    if (!dailyOccupancy || dailyOccupancy.length === 0) return false;
    return dailyOccupancy.some(day => (day.guests || 0) > 0);
  };

  // pool: unspent funds carried forward for this person, tagged by source so a
  // later stay's coverage is attributed to payments vs receipts (never a
  // generic "earlier credit" bucket). Mutated in place by each stay.
  const calculateStayData = (reservation: any, previousBalance: number = 0, pool: { payment: number; receipt: number; transferInQueue: { id: string; fromName: string; notes?: string; remaining: number }[] } = { payment: 0, receipt: 0, transferInQueue: [] }) => {
    // Handle virtual split reservations
    if (reservation.isVirtualSplit) {
      const splitPayment = reservation.splitData.payment;
      const days = reservation.splitData.dailyOccupancy;

      const chargesDue = Math.max(0, Number(splitPayment.amount) || 0);
      const paidRaw = Math.max(0, Number(splitPayment.amount_paid) || 0);
      const ownPaidApplied = Math.min(paidRaw, chargesDue);
      let remaining = chargesDue - ownPaidApplied;

      // Transferred credit is applied first — it was intentionally moved between people.
      const carriedInTransfers: { amount: number; fromName: string; notes?: string }[] = [];
      let transferRemaining = remaining;
      while (transferRemaining > 0.004 && pool.transferInQueue.length > 0) {
        const head = pool.transferInQueue[0];
        const use = Math.min(head.remaining, transferRemaining);
        head.remaining -= use;
        transferRemaining -= use;
        carriedInTransfers.push({ amount: use, fromName: head.fromName, notes: head.notes });
        if (head.remaining <= 0.004) pool.transferInQueue.shift();
      }
      const carriedInTransfer = carriedInTransfers.reduce((sum, t) => sum + t.amount, 0);
      remaining -= carriedInTransfer;

      const carriedInPayment = Math.min(pool.payment, remaining);
      pool.payment -= carriedInPayment; remaining -= carriedInPayment;
      const carriedInReceipt = Math.min(pool.receipt, remaining);
      pool.receipt -= carriedInReceipt; remaining -= carriedInReceipt;
      const paidApplied = ownPaidApplied + carriedInPayment;
      const unpaidRemaining = Math.max(0, remaining);
      pool.payment += paidRaw - ownPaidApplied; // overpayment carries forward, payment-tagged

      return {
        nights: days.length,
        receiptsTotal: 0,
        receiptsCount: 0,
        receiptsApplied: carriedInReceipt,
        receiptsOverflow: 0,
        paidApplied,
        paymentOverflow: Math.max(0, paidRaw - ownPaidApplied),
        transferredInApplied: carriedInTransfer,
        carriedInTransfers,
        priorCreditApplied: carriedInPayment + carriedInReceipt + carriedInTransfer,
        unpaidRemaining,
        chargesDue,
        carriedInPayment,
        carriedInReceipt,
        carriedInTransfer,
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

    // Allocation of THIS stay's charges, oldest money first: this stay's own
    // cash/check payments, then credit carried in from earlier (transfers, then
    // payment credit, then receipt credit), and finally this stay's own
    // receipts. Draining carryover before new receipts keeps older credit from
    // lingering and reappearing on a much later stay. What remains is unpaid;
    // overpayments and unused receipts carry forward into the tagged pool.
    const chargesDue = Math.max(0, billingAmount + manualAdjustment);
    const paidRaw = Math.max(0, amountPaid);
    const receiptsRaw = Math.max(0, receiptsTotal);
    // Money recorded on this stay settles anything still owed from earlier
    // stays first (charges accumulate), then this stay's own charges. Only a
    // genuine surplus beyond everything owed to date becomes forward credit.
    const priorOwed = Math.max(0, previousBalance);
    const owedThroughThisStay = priorOwed + chargesDue;
    const ownPaidApplied = Math.min(paidRaw, owedThroughThisStay);
    let remaining = owedThroughThisStay - ownPaidApplied;


    // Transferred credit is applied first — it was intentionally moved between people.
    const carriedInTransfers: { amount: number; fromName: string; notes?: string }[] = [];
    let transferRemaining = remaining;
    while (transferRemaining > 0.004 && pool.transferInQueue.length > 0) {
      const head = pool.transferInQueue[0];
      const use = Math.min(head.remaining, transferRemaining);
      head.remaining -= use;
      transferRemaining -= use;
      carriedInTransfers.push({ amount: use, fromName: head.fromName, notes: head.notes });
      if (head.remaining <= 0.004) pool.transferInQueue.shift();
    }
    const carriedInTransfer = carriedInTransfers.reduce((sum, t) => sum + t.amount, 0);
    remaining -= carriedInTransfer;

    const carriedInPayment = Math.min(pool.payment, remaining);
    pool.payment -= carriedInPayment; remaining -= carriedInPayment;
    const carriedInReceipt = Math.min(pool.receipt, remaining);
    pool.receipt -= carriedInReceipt; remaining -= carriedInReceipt;

    const ownReceiptsApplied = Math.min(receiptsRaw, remaining);
    remaining -= ownReceiptsApplied;

    const paidApplied = ownPaidApplied + carriedInPayment;
    const receiptsApplied = ownReceiptsApplied + carriedInReceipt;
    const priorCreditApplied = carriedInPayment + carriedInReceipt + carriedInTransfer;
    const unpaidRemaining = Math.max(0, remaining);
    const receiptsOverflow = Math.max(0, receiptsRaw - ownReceiptsApplied);
    pool.payment += paidRaw - ownPaidApplied; // overpayment carries forward, payment-tagged
    pool.receipt += receiptsOverflow;         // receipt overflow carries forward, receipt-tagged

    return {
      nights,
      receiptsTotal,
      receiptsCount,
      receiptsApplied,
      receiptsOverflow,
      paidApplied,
      paymentOverflow: Math.max(0, paidRaw - ownPaidApplied),
      transferredInApplied: carriedInTransfer,
      carriedInTransfers,
      priorCreditApplied,
      unpaidRemaining,
      chargesDue,
      carriedInPayment,
      carriedInReceipt,
      carriedInTransfer,

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
  

  // Build a map of ledger key -> display name so transfer records are shown
  // with the recipient/source person, not a raw key.
  const transferDisplayNameMap = new Map<string, string>();
  for (const group of (familyGroups || []) as any[]) {
    const members = Array.isArray(group.host_members) ? group.host_members : [];
    for (const member of members) {
      if (!member?.name) continue;
      const key = member.email
        ? `p:${String(member.email).trim().toLowerCase()}`
        : `n:${String(member.name).trim().toLowerCase()}`;
      if (!transferDisplayNameMap.has(key)) {
        transferDisplayNameMap.set(key, member.name);
      }
    }
  }
  const getTransferDisplayName = (key: string) => transferDisplayNameMap.get(key) || key;

  // Ledger key -> family group name, used for group-lead transfer permissions.
  const memberGroupMap = new Map<string, string>();
  for (const group of (familyGroups || []) as any[]) {
    const members = Array.isArray(group.host_members) ? group.host_members : [];
    for (const member of members) {
      if (!member?.name) continue;
      const key = member.email
        ? `p:${String(member.email).trim().toLowerCase()}`
        : `n:${String(member.name).trim().toLowerCase()}`;
      if (!memberGroupMap.has(key)) memberGroupMap.set(key, group.name);
    }
  }

  // Group credit transfers by source and target ledger key, ordered by date.
  const transfersBySource = new Map<string, any[]>();
  const transfersByTarget = new Map<string, any[]>();
  for (const t of creditTransfers || []) {
    const sList = transfersBySource.get(t.from_ledger_name) || [];
    sList.push(t);
    transfersBySource.set(t.from_ledger_name, sList);
    const tList = transfersByTarget.get(t.to_ledger_name) || [];
    tList.push(t);
    transfersByTarget.set(t.to_ledger_name, tList);
  }
  for (const list of [...transfersBySource.values(), ...transfersByTarget.values()]) {
    list.sort((a, b) => parseDateOnly(a.transfer_date).getTime() - parseDateOnly(b.transfer_date).getTime());
  }

  // Simple chronological ledger: for each host, walk stays oldest → newest and
  // let each stay's newBalance = previousBalance + charges - payments - receipts.
  // Alongside the balance, a source-tagged pool ({payment, receipt}) tracks
  // unspent funds so carried credit is attributed to its original source.
  // Transfers in/out mutate the pool before/after the relevant stay dates.
  const hostBalances = new Map<string, number>();
  const hostPools = new Map<string, { payment: number; receipt: number; transferInQueue: { id: string; fromName: string; notes?: string; remaining: number }[] }>();
  const hostTransferPointers = new Map<string, { outIndex: number; inIndex: number }>();
  const reservationsWithBalance: any[] = [];

  const applyOutgoingTransfers = (hostKey: string, beforeDate: Date, pool: { payment: number; receipt: number; transferInQueue: { id: string; fromName: string; notes?: string; remaining: number }[] }) => {
    const list = transfersBySource.get(hostKey);
    if (!list) return;
    const ptr = hostTransferPointers.get(hostKey) || { outIndex: 0, inIndex: 0 };
    while (ptr.outIndex < list.length && parseDateOnly(list[ptr.outIndex].transfer_date).getTime() <= beforeDate.getTime()) {
      const t = list[ptr.outIndex++];
      const amount = Number(t.amount) || 0;
      hostBalances.set(hostKey, (hostBalances.get(hostKey) || 0) + amount);
      let remainingOut = amount;
      const fromPayment = Math.min(pool.payment, remainingOut);
      pool.payment -= fromPayment; remainingOut -= fromPayment;
      const fromReceipt = Math.min(pool.receipt, remainingOut);
      pool.receipt -= fromReceipt; remainingOut -= fromReceipt;
      const transferPoolTotal = pool.transferInQueue.reduce((sum, q) => sum + q.remaining, 0);
      const fromTransfer = Math.min(transferPoolTotal, remainingOut);
      if (fromTransfer > 0) {
        let toDrain = fromTransfer;
        for (const head of pool.transferInQueue) {
          if (toDrain <= 0.004) break;
          const drain = Math.min(head.remaining, toDrain);
          head.remaining -= drain;
          toDrain -= drain;
        }
        pool.transferInQueue = pool.transferInQueue.filter(q => q.remaining > 0.004);
      }
    }
    hostTransferPointers.set(hostKey, ptr);
  };

  const applyIncomingTransfers = (hostKey: string, beforeDate: Date, pool: { payment: number; receipt: number; transferInQueue: { id: string; fromName: string; notes?: string; remaining: number }[] }) => {
    const list = transfersByTarget.get(hostKey);
    if (!list) return;
    const ptr = hostTransferPointers.get(hostKey) || { outIndex: 0, inIndex: 0 };
    while (ptr.inIndex < list.length && parseDateOnly(list[ptr.inIndex].transfer_date).getTime() <= beforeDate.getTime()) {
      const t = list[ptr.inIndex++];
      const amount = Number(t.amount) || 0;
      hostBalances.set(hostKey, (hostBalances.get(hostKey) || 0) - amount);
      pool.transferInQueue.push({
        id: t.id,
        fromName: getTransferDisplayName(t.from_ledger_name),
        notes: t.notes,
        remaining: amount,
      });
    }
    hostTransferPointers.set(hostKey, ptr);
  };

  for (const reservation of sortedReservations) {
    const hostKey = getLedgerKey(reservation);
    const pool = hostPools.get(hostKey) || { payment: 0, receipt: 0, transferInQueue: [] };
    hostPools.set(hostKey, pool);
    const beforeDate = parseDateOnly(reservation.start_date);
    applyOutgoingTransfers(hostKey, beforeDate, pool);
    applyIncomingTransfers(hostKey, beforeDate, pool);
    const previousBalance = hostBalances.get(hostKey) || 0;
    const stayData = calculateStayData(reservation, previousBalance, pool);
    // stayData.currentBalance is the *charge* delta for this stay
    // (billing + adjustment - payments - receipts). amountDue already = prev + delta.
    reservationsWithBalance.push({ reservation, stayData });
    hostBalances.set(hostKey, previousBalance + stayData.currentBalance);
  }

  // Credit only ever moves forward in time: a later stay's receipts never reach
  // back to settle an earlier stay. Each stay closes with its own balance, which
  // becomes the next stay's previous balance.




  // Full ledger is oldest → newest for calculations.
  const fullLedger = [...reservationsWithBalance];

  // Identify the last (newest) reservation for each host across the FULL ledger
  const lastReservationByHost = new Map<string, string>();
  for (let i = fullLedger.length - 1; i >= 0; i--) {
    const { reservation } = fullLedger[i];
    const hostKey = getLedgerKey(reservation);
    if (!lastReservationByHost.has(hostKey)) {
      lastReservationByHost.set(hostKey, reservation.id);
    }
  }

  // Apply any credit transfers dated after the last stay for each host so the
  // final balance and source-tagged pools reflect them. These remain separate
  // ledger transactions; they must not rewrite the ending balance of a stay.
  for (const [hostKey, list] of transfersBySource.entries()) {
    const ptr = hostTransferPointers.get(hostKey) || { outIndex: 0, inIndex: 0 };
    const pool = hostPools.get(hostKey) || { payment: 0, receipt: 0, transferInQueue: [] };
    while (ptr.outIndex < list.length) {
      const t = list[ptr.outIndex++];
      const amount = Number(t.amount) || 0;
      hostBalances.set(hostKey, (hostBalances.get(hostKey) || 0) + amount);
      let remainingOut = amount;
      const fromPayment = Math.min(pool.payment, remainingOut);
      pool.payment -= fromPayment; remainingOut -= fromPayment;
      const fromReceipt = Math.min(pool.receipt, remainingOut);
      pool.receipt -= fromReceipt; remainingOut -= fromReceipt;
    }
    hostTransferPointers.set(hostKey, ptr);
  }
  for (const [hostKey, list] of transfersByTarget.entries()) {
    const ptr = hostTransferPointers.get(hostKey) || { outIndex: 0, inIndex: 0 };
    const pool = hostPools.get(hostKey) || { payment: 0, receipt: 0, transferInQueue: [] };
    while (ptr.inIndex < list.length) {
      const t = list[ptr.inIndex++];
      const amount = Number(t.amount) || 0;
      hostBalances.set(hostKey, (hostBalances.get(hostKey) || 0) - amount);
      pool.transferInQueue.push({
        id: t.id,
        fromName: getTransferDisplayName(t.from_ledger_name),
        notes: t.notes,
        remaining: amount,
      });
    }
    hostTransferPointers.set(hostKey, ptr);
  }

  // Reconstruct each person's visible statement as dated ledger events. A stay
  // closes first on its date; transfers on that date follow in creation order.
  // This gives every transfer an auditable opening and resulting balance while
  // preserving historical stay balances.
  type TransferLedgerDetail = {
    eventId: string;
    hostKey: string;
    direction: 'out' | 'in';
    previousBalance: number;
    newBalance: number;
    isCurrent: boolean;
  };
  const transferLedgerDetails = new Map<string, TransferLedgerDetail>();
  const latestLedgerEventByHost = new Map<string, string>();
  const finalBalanceByHost = new Map<string, number>();
  const ledgerHostKeys = new Set<string>([
    ...fullLedger.map(({ reservation }) => getLedgerKey(reservation)),
    ...Array.from(transfersBySource.keys()),
    ...Array.from(transfersByTarget.keys()),
  ]);

  for (const hostKey of ledgerHostKeys) {
    const events: Array<{
      id: string;
      date: number;
      order: number;
      createdAt: number;
      delta: number;
      stayData?: any;
      transfer?: any;
      direction?: 'out' | 'in';
    }> = [];

    for (const { reservation, stayData } of fullLedger) {
      if (getLedgerKey(reservation) !== hostKey) continue;
      events.push({
        id: `stay:${reservation.id}`,
        date: parseDateOnly(reservation.start_date).getTime(),
        order: 0,
        createdAt: 0,
        delta: stayData.currentBalance,
        stayData,
      });
    }

    for (const transfer of transfersBySource.get(hostKey) || []) {
      events.push({
        id: `transfer:${transfer.id}:out`,
        date: parseDateOnly(transfer.transfer_date).getTime(),
        order: 1,
        createdAt: transfer.created_at ? new Date(transfer.created_at).getTime() : 0,
        delta: Number(transfer.amount) || 0,
        transfer,
        direction: 'out',
      });
    }
    for (const transfer of transfersByTarget.get(hostKey) || []) {
      events.push({
        id: `transfer:${transfer.id}:in`,
        date: parseDateOnly(transfer.transfer_date).getTime(),
        order: 1,
        createdAt: transfer.created_at ? new Date(transfer.created_at).getTime() : 0,
        delta: -(Number(transfer.amount) || 0),
        transfer,
        direction: 'in',
      });
    }

    events.sort((a, b) =>
      a.date - b.date ||
      a.order - b.order ||
      a.createdAt - b.createdAt ||
      a.id.localeCompare(b.id)
    );

    let balance = 0;
    for (const event of events) {
      const previousBalance = balance;
      balance += event.delta;
      latestLedgerEventByHost.set(hostKey, event.id);
      if (event.stayData) {
        event.stayData.previousBalance = previousBalance;
        event.stayData.amountDue = balance;
      }
      if (event.transfer && event.direction) {
        transferLedgerDetails.set(`${event.transfer.id}|${hostKey}`, {
          eventId: event.id,
          hostKey,
          direction: event.direction,
          previousBalance,
          newBalance: balance,
          isCurrent: false,
        });
      }
    }
    // Closing balance after EVERY event (stays and transfers alike). Summary
    // totals use this so credit moved out is not still counted as held.
    finalBalanceByHost.set(hostKey, balance);
  }

  for (const detail of transferLedgerDetails.values()) {
    detail.isCurrent = latestLedgerEventByHost.get(detail.hostKey) === detail.eventId;
  }

  // Apply the year filter to display ONLY (math already ran globally),
  // then reverse so the most current stay appears at the top.
  const displayReservations = fullLedger
    .filter(({ reservation }) => {
      if (selectedYear === 0) return true;
      return parseDateOnly(reservation.start_date).getFullYear() === selectedYear;
    })
    .reverse();

  // Receipt-only credit crossing a calendar-year boundary, kept separate for
  // every person. Receipts recorded on the first stay of a new year represent
  // receipts received since that person's previous stay, so their net overflow
  // belongs in the opening-year marker as well. Any portion moved backward to
  // settle an older charge is removed before the rollover is shown.
  const receiptCarryIntoYear = new Map<string, number>();
  const yearsByHost = new Map<string, number[]>();
  {
    const itemsByHost = new Map<string, typeof fullLedger>();
    for (const item of fullLedger) {
      const hostKey = getLedgerKey(item.reservation);
      const items = itemsByHost.get(hostKey) || [];
      items.push(item);
      itemsByHost.set(hostKey, items);
    }

    for (const [hostKey, items] of itemsByHost.entries()) {
      let priorYear: number | null = null;
      let priorBalance = 0;
      const hostYears: number[] = [];

      for (const item of items) {
        const year = parseDateOnly(item.reservation.start_date).getFullYear();
        if (!hostYears.includes(year)) hostYears.push(year);

        // The whole credit balance standing at the end of the prior year is what
        // crosses into the new year — payment credit, receipt credit and transfers alike.
        if (priorYear !== null && year !== priorYear && priorBalance < -0.004) {
          receiptCarryIntoYear.set(`${hostKey}|${year}`, Math.abs(priorBalance));
        }

        priorBalance = item.stayData.amountDue;
        priorYear = year;
      }

      yearsByHost.set(hostKey, hostYears);
    }
  }

  // Summary stats — apply year filter for display counts, but Current Balance
  // reflects the GLOBAL running balance (sum across hosts) so it doesn't shift
  // when the user narrows the year filter.
  const visibleReservations = displayReservations.map(r => r.reservation);
  const totalStays = visibleReservations.length;
  // Guest Nights = people × nights. Uses the actual per-day guest counts
  // recorded on each stay; stays with no people numbers yet contribute 0.
  const totalNights = displayReservations.reduce((sum, r) => {
    const days = r.stayData?.dailyOccupancy || [];
    return sum + days.reduce((s: number, d: any) => s + (d.guests || 0), 0);
  }, 0);
  // "Paid" means money that actually arrived against the stays shown. Credit
  // carried in from an earlier stay/year is reported separately so the boxes add up.
  const totalPaid = displayReservations.reduce(
    (sum, r) => sum + Math.max(0, (r.stayData.paidApplied || 0) - (r.stayData.carriedInPayment || 0)),
    0
  );
  const totalCreditApplied = displayReservations.reduce((sum, r) => sum + (r.stayData.carriedInPayment || 0), 0);
  const totalCharges = displayReservations.reduce(
    (sum, r) => sum + (r.stayData.billingAmount || 0) + (r.stayData.manualAdjustment || 0),
    0
  );
  const totalReceiptsCredited = displayReservations.reduce((sum, r) => sum + (r.stayData.receiptsApplied || 0), 0);
  // Charges still unpaid = what each visible person still owes at the END of the
  // stays currently shown (the year filter included). Intermediate stays later
  // covered by credit are not outstanding, so summing per-stay shortfalls would
  // overstate it. displayReservations is newest-first, so the first entry per host
  // is that person's latest visible stay. Credit is never pooled across people.
  const lastVisibleBalanceByHost = new Map<string, number>();
  for (const item of displayReservations) {
    const hostKey = getLedgerKey(item.reservation);
    if (!lastVisibleBalanceByHost.has(hostKey)) {
      lastVisibleBalanceByHost.set(hostKey, item.stayData.amountDue || 0);
    }
  }
  const totalStillOwed = Array.from(lastVisibleBalanceByHost.values()).reduce(
    (sum, balance) => sum + Math.max(0, balance),
    0
  );
  const totalTransferredInApplied = displayReservations.reduce((sum, r) => sum + (r.stayData.transferredInApplied || 0), 0);

  // Data handed to the CSV export dialog — exactly the stays currently listed.
  const exportSeasonData = {
    config: {
      startDate: selectedYear !== 0
        ? `${selectedYear}-01-01`
        : (visibleReservations.length
            ? [...visibleReservations].sort((a, b) => parseDateOnly(a.start_date).getTime() - parseDateOnly(b.start_date).getTime())[0].start_date
            : `${new Date().getFullYear()}-01-01`),
      endDate: selectedYear !== 0
        ? `${selectedYear}-12-31`
        : (visibleReservations.length
            ? [...visibleReservations].sort((a, b) => parseDateOnly(b.end_date).getTime() - parseDateOnly(a.end_date).getTime())[0].end_date
            : `${new Date().getFullYear()}-12-31`),
    },
    stays: displayReservations.map(({ reservation, stayData }) => ({
      reservation,
      billing: {
        baseAmount: stayData.billingAmount || 0,
        total: (stayData.billingAmount || 0) + (stayData.manualAdjustment || 0),
      },
      payment: {
        amount_paid: stayData.paidApplied || 0,
        status: stayData.unpaidRemaining > 0.004 ? 'unpaid' : 'paid',
        daily_occupancy: stayData.dailyOccupancy,
      },
    })),
    totals: {
      totalNights,
      totalCharged: totalCharges,
      totalPaid,
      outstandingBalance: totalStillOwed,
      actualGuestsAvg: totalStays > 0 ? totalNights / totalStays : 0,
    },
  };


  // Standing credit: people with NO stays still hold credit from transfers they
  // received and receipts they turned in. Without this they have nothing to
  // anchor a balance to and their credit is invisible.
  const standingCredit = new Map<string, {
    amount: number;
    transfersIn: number;
    transfersOut: number;
    receiptsTotal: number;
    receiptsCount: number;
  }>();
  {
    const candidateKeys = new Set<string>([
      ...transfersByTarget.keys(),
      ...transfersBySource.keys(),
      ...standingReceiptTotals.keys(),
    ]);
    for (const key of candidateKeys) {
      if (hostKeysWithStays.has(key)) continue;
      const transfersIn = (transfersByTarget.get(key) || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const transfersOut = (transfersBySource.get(key) || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const rc = standingReceiptTotals.get(key) || { total: 0, count: 0 };
      const amount = transfersIn - transfersOut + rc.total;
      if (amount <= 0.004) continue;
      standingCredit.set(key, {
        amount,
        transfersIn,
        transfersOut,
        receiptsTotal: rc.total,
        receiptsCount: rc.count,
      });
    }
  }

  // Each person's true closing balance: every stay AND every credit transfer,
  // plus receipts held by people with no stays. Positive = owed, negative = credit.
  const netBalanceByHost = new Map<string, number>();
  for (const [hostKey, balance] of finalBalanceByHost.entries()) {
    netBalanceByHost.set(hostKey, balance);
  }
  for (const [key, entry] of standingCredit.entries()) {
    // standingCredit already nets transfers in/out for stay-less people, so
    // replace (not add to) whatever the transfer-only ledger produced.
    netBalanceByHost.set(key, -entry.amount);
  }

  // People counted in the summary cards: anyone with a stay in the current view,
  // plus stay-less credit holders inside the selected family group.
  const summaryHostKeys = new Set<string>(fullLedger.map(({ reservation }) => getLedgerKey(reservation)));
  for (const key of standingCredit.keys()) {
    if (selectedFamilyGroup !== 'all' && memberGroupMap.get(key) !== selectedFamilyGroup) continue;
    if (scopeIsMineOnly && key !== currentUserLedgerKey) continue;
    summaryHostKeys.add(key);
  }

  const currentBalance = Array.from(summaryHostKeys).reduce(
    (sum, key) => sum + (netBalanceByHost.get(key) || 0),
    0
  );

  // Map each person with a credit balance to the amount available to transfer.
  // Used for both self-service transfer buttons and admin source selection.
  const hostCreditMap = new Map<string, number>();
  for (const [hostKey, balance] of netBalanceByHost.entries()) {
    if (balance < -0.004) hostCreditMap.set(hostKey, Math.abs(balance));
  }

  const currentUserHasTransferableCredit = currentUserLedgerKey
    ? (hostCreditMap.get(currentUserLedgerKey) || 0)
    : 0;
  const currentUserStandingCredit = currentUserLedgerKey
    ? standingCredit.get(currentUserLedgerKey)
    : undefined;

  // Members whose credit the signed-in person is allowed to move.
  const canTransferForHostKey = (hostKey: string) => {
    if (isAdmin) return true;
    if (currentUserLedgerKey && hostKey === currentUserLedgerKey) return true;
    if (canActForFamilyInStayHistory) {
      return memberGroupMap.get(hostKey) === leadGroupName;
    }
    return false;
  };
  const transferableCreditKeys = Array.from(hostCreditMap.keys()).filter(canTransferForHostKey);
  const totalTransferableCredit = transferableCreditKeys.reduce(
    (sum, key) => sum + (hostCreditMap.get(key) || 0),
    0
  );

  // Standing-credit holders the viewer is allowed to see (their own, their group
  // as a lead, everyone as an admin), respecting the family-group filter.
  const visibleStandingCredit = Array.from(standingCredit.entries())
    .filter(([key]) => selectedFamilyGroup === 'all' || memberGroupMap.get(key) === selectedFamilyGroup)
    .filter(([key]) => canTransferForHostKey(key) || key === currentUserLedgerKey);
  const visibleStandingCreditTotal = visibleStandingCredit.reduce((sum, [, e]) => sum + e.amount, 0);

  const openTransferForKey = (key: string, amount: number) => {
    setTransferDialogSourceKey(key);
    setTransferDialogSourceLabel(getTransferDisplayName(key));
    setTransferDialogCredit(amount);
    setTransferDialogOpen(true);
  };

  // Credit transfers visible in the current view (source or recipient belongs to a host shown,
  // or to a person holding standing credit here — they have no stays to attach to).
  const visibleHostKeys = new Set<string>();
  for (const { reservation } of displayReservations) {
    visibleHostKeys.add(getLedgerKey(reservation));
  }
  for (const key of standingCredit.keys()) {
    if (selectedFamilyGroup !== 'all' && memberGroupMap.get(key) !== selectedFamilyGroup) continue;
    visibleHostKeys.add(key);
  }
  if (currentUserLedgerKey) visibleHostKeys.add(currentUserLedgerKey);
  const visibleTransfers = (creditTransfers || []).filter(t =>
    visibleHostKeys.has(t.from_ledger_name) || visibleHostKeys.has(t.to_ledger_name)
  );
  const visibleTransferEntries = visibleTransfers.flatMap(transfer => {
    const entries: Array<{ transfer: any; detail: TransferLedgerDetail }> = [];
    const sourceDetail = transferLedgerDetails.get(`${transfer.id}|${transfer.from_ledger_name}`);
    const targetDetail = transferLedgerDetails.get(`${transfer.id}|${transfer.to_ledger_name}`);
    if (sourceDetail && visibleHostKeys.has(transfer.from_ledger_name)) {
      entries.push({ transfer, detail: sourceDetail });
    }
    if (targetDetail && visibleHostKeys.has(transfer.to_ledger_name)) {
      entries.push({ transfer, detail: targetDetail });
    }
    return entries;
  }).filter(({ transfer }) =>
    selectedYear === 0 || parseDateOnly(transfer.transfer_date).getFullYear() === selectedYear
  );

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

          <ViewAsUserPicker />



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

        {visibleStandingCredit.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Credit Balance</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleStandingCredit.map(([key, entry]) => (
                <Card key={key}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {getTransferDisplayName(key)}
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      +${entry.amount.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available credit. It will be applied to the next stay booked in this name.
                    </p>
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {entry.transfersIn > 0.004 && (
                        <div>Transferred in: ${entry.transfersIn.toFixed(2)}</div>
                      )}
                      {entry.transfersOut > 0.004 && (
                        <div>Transferred out: ${entry.transfersOut.toFixed(2)}</div>
                      )}
                      {entry.receiptsCount > 0 && (
                        <div>
                          Receipts submitted ({entry.receiptsCount}): ${entry.receiptsTotal.toFixed(2)}
                        </div>
                      )}
                    </div>
                    {canTransferForHostKey(key) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => openTransferForKey(key, entry.amount)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer Credit
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {visibleTransfers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Credit Transfers</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {visibleTransfers
                    .slice()
                    .sort((a, b) => parseDateOnly(b.transfer_date).getTime() - parseDateOnly(a.transfer_date).getTime())
                    .map(t => (
                      <div key={t.id} className="flex items-center justify-between p-4">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">
                            {format(parseDateOnly(t.transfer_date), 'MMM d, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getTransferDisplayName(t.from_ledger_name)} → {getTransferDisplayName(t.to_ledger_name)}
                          </div>
                          {t.notes && (
                            <div className="text-xs text-muted-foreground italic">{t.notes}</div>
                          )}
                        </div>
                        <div className="text-sm font-semibold">${Number(t.amount).toFixed(2)}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <TransferCreditDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          sourceKey={transferDialogSourceKey}
          sourceLabel={transferDialogSourceLabel}
          availableCredit={transferDialogCredit}
          familyGroups={familyGroups || []}
          isAdmin={!!isAdmin}
          scope={transferScope}
          scopeGroupName={leadGroupName}
          currentUserKey={currentUserLedgerKey}
          creditBySource={Object.fromEntries(hostCreditMap)}
          onTransfer={async ({ from_ledger_name, to_ledger_name, amount, transfer_date, notes }) => {
            const result = await createTransfer({
              from_ledger_name,
              to_ledger_name,
              amount,
              transfer_date,
              notes,
            });
            if (result) {
              toast.success('Credit transferred successfully');
              await refetchTransfers();
              await fetchPayments(1, 500);
              setTransferDialogOpen(false);
            }
          }}
        />
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

        <ViewAsUserPicker />

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

          {/* Scope toggle (group leads and members with Stay History permission) */}
          {canChooseScope && (
            <div className="inline-flex items-center rounded-md border bg-card p-1">
              <Button
                type="button"
                size="sm"
                variant={leadScope === 'mine' ? 'default' : 'ghost'}
                onClick={() => setLeadScope('mine')}
              >
                My stays
              </Button>
              <Button
                type="button"
                size="sm"
                variant={leadScope === 'family' ? 'default' : 'ghost'}
                onClick={() => setLeadScope('family')}
              >
                Whole family
              </Button>
            </div>
          )}

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
            {isAdmin && (
              <Button variant="outline" onClick={handleSync}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Data
              </Button>
            )}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            <CardTitle className="text-sm font-medium">Guest Nights</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNights}</div>
            <p className="text-xs text-muted-foreground mt-1">people × nights</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Charges</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCharges.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Stay costs for the stays shown</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Charges Paid-via Venmo, check, cash etc</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Money paid toward the stays shown</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts Credited</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalReceiptsCredited.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Charges paid via receipt credit</p>
          </CardContent>
        </Card>
        {totalTransferredInApplied > 0.004 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid via Transferred Credit</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalTransferredInApplied.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Credit moved between family members</p>
            </CardContent>
          </Card>
        )}
        {totalStillOwed > 0.004 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Charges Still Unpaid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">${totalStillOwed.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Not yet covered by payments or credit</p>
            </CardContent>
          </Card>
        )}

        {isAdmin && selectedFamilyGroup === 'all' && transferableCreditKeys.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Available to Transfer</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                +${totalTransferableCredit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Held by {transferableCreditKeys.length} member{transferableCreditKeys.length === 1 ? '' : 's'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  if (isAdmin || canActForFamilyInStayHistory) {
                    setTransferDialogSourceKey(null);
                    setTransferDialogSourceLabel("");
                    setTransferDialogCredit(0);
                  } else if (currentUserLedgerKey && currentUserHasTransferableCredit > 0.004) {
                    setTransferDialogSourceKey(currentUserLedgerKey);
                    setTransferDialogSourceLabel(getTransferDisplayName(currentUserLedgerKey));
                    setTransferDialogCredit(currentUserHasTransferableCredit);
                  }
                  setTransferDialogOpen(true);
                }}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Credit
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedFamilyGroup !== 'all' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {currentBalance < 0 ? 'Credit Remaining' : 'Current Balance'}
              </CardTitle>
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
              {currentBalance < 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  From payments and receipts above total charges
                </p>
              )}
              {transferableCreditKeys.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                  if (isAdmin || canActForFamilyInStayHistory) {
                    setTransferDialogSourceKey(null);
                    setTransferDialogSourceLabel("");
                    setTransferDialogCredit(0);
                  } else if (currentUserLedgerKey && currentUserHasTransferableCredit > 0.004) {
                    setTransferDialogSourceKey(currentUserLedgerKey);
                    setTransferDialogSourceLabel(getTransferDisplayName(currentUserLedgerKey));
                    setTransferDialogCredit(currentUserHasTransferableCredit);
                  }
                  setTransferDialogOpen(true);
                }}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Credit
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {visibleStandingCredit.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Credit Held Without a Stay</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleStandingCredit.map(([key, entry]) => (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{getTransferDisplayName(key)}</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +${entry.amount.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available credit. It will be applied to the next stay booked in this name.
                  </p>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {entry.transfersIn > 0.004 && <div>Transferred in: ${entry.transfersIn.toFixed(2)}</div>}
                    {entry.transfersOut > 0.004 && <div>Transferred out: ${entry.transfersOut.toFixed(2)}</div>}
                    {entry.receiptsCount > 0 && (
                      <div>Receipts submitted ({entry.receiptsCount}): ${entry.receiptsTotal.toFixed(2)}</div>
                    )}
                  </div>
                  {canTransferForHostKey(key) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => openTransferForKey(key, entry.amount)}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer Credit
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}



      {visibleTransferEntries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Credit Transfers</h2>
          {visibleTransferEntries
            .slice()
            .sort((a, b) => {
              const dateDiff = parseDateOnly(b.transfer.transfer_date).getTime() - parseDateOnly(a.transfer.transfer_date).getTime();
              if (dateDiff !== 0) return dateDiff;
              const createdDiff = new Date(b.transfer.created_at || 0).getTime() - new Date(a.transfer.created_at || 0).getTime();
              if (createdDiff !== 0) return createdDiff;
              return b.detail.eventId.localeCompare(a.detail.eventId);
            })
            .map(({ transfer: t, detail }) => {
              const amount = Number(t.amount) || 0;
              const previousIsCredit = detail.previousBalance < -0.004;
              const newIsCredit = detail.newBalance < -0.004;
              const counterpart = detail.direction === 'out'
                ? getTransferDisplayName(t.to_ledger_name)
                : getTransferDisplayName(t.from_ledger_name);
              return (
                <Card key={detail.eventId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {detail.direction === 'out' ? `Credit transfer to ${counterpart}` : `Credit transfer from ${counterpart}`}
                    </CardTitle>
                    <CardDescription>
                      {format(parseDateOnly(t.transfer_date), 'MMM d, yyyy')}
                      {t.notes ? ` · ${t.notes}` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {previousIsCredit ? 'Previous Balance (Credit):' : 'Previous Balance:'}
                      </span>
                      <span className={`font-medium ${detail.previousBalance > 0 ? 'text-destructive' : previousIsCredit ? 'text-green-600' : ''}`}>
                        {previousIsCredit ? '+' : ''}${Math.abs(detail.previousBalance).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {detail.direction === 'out' ? `Transfer to ${counterpart}:` : `Transfer from ${counterpart}:`}
                      </span>
                      <span className={`font-medium ${detail.direction === 'in' ? 'text-green-600' : ''}`}>
                        {detail.direction === 'out' ? '−' : '+'}${amount.toFixed(2)}
                      </span>
                    </div>
                    <div className={`flex justify-between text-sm border-t pt-2 ${detail.isCurrent ? 'bg-muted/40 -mx-2 px-2 py-2 rounded' : ''}`}>
                      <span className="font-semibold">
                        {detail.isCurrent ? 'Current Balance' : 'New Balance'}{newIsCredit ? ' (Credit):' : ':'}
                      </span>
                      <span className={`font-bold ${detail.newBalance > 0 ? 'text-destructive' : newIsCredit ? 'text-green-600' : ''}`}>
                        {newIsCredit ? '+' : ''}${Math.abs(detail.newBalance).toFixed(2)}
                      </span>
                    </div>
                    {t.created_by_user_id && user?.id === t.created_by_user_id &&
                      currentUserLedgerKey && t.from_ledger_name !== currentUserLedgerKey && (
                      <div className="text-xs text-muted-foreground italic">
                        Recorded by you on their behalf
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}


      {/* Past Stays List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Past Stays</h2>
        {displayReservations.map(({ reservation, stayData }, idx) => {
          const isLastVisible = latestLedgerEventByHost.get(getLedgerKey(reservation)) === `stay:${reservation.id}`;
          const currentYear = parseDateOnly(reservation.start_date).getFullYear();
          const hostKey = getLedgerKey(reservation);
          const olderVisibleStayForHost = displayReservations
            .slice(idx + 1)
            .find(item => getLedgerKey(item.reservation) === hostKey);
          const olderVisibleYear = olderVisibleStayForHost
            ? parseDateOnly(olderVisibleStayForHost.reservation.start_date).getFullYear()
            : null;
          const newerVisibleStayForHost = displayReservations
            .slice(0, idx)
            .find(item => getLedgerKey(item.reservation) === hostKey);
          const newerVisibleYear = newerVisibleStayForHost
            ? parseDateOnly(newerVisibleStayForHost.reservation.start_date).getFullYear()
            : null;
          const isOldestVisibleStayForHost = !olderVisibleStayForHost;
          const hasEarlierYearForHost = (yearsByHost.get(hostKey) || []).some(year => year < currentYear);
          const showReceiptYearBoundary = selectedYear === 0
            ? olderVisibleYear !== null && olderVisibleYear < currentYear
            : isOldestVisibleStayForHost && hasEarlierYearForHost;
          const receiptCarry = receiptCarryIntoYear.get(`${hostKey}|${currentYear}`) || 0;
          const netReceiptOverflow = Math.max(0, stayData.receiptsOverflow || 0);
          const receiptOverflowMovesIntoLaterYear = newerVisibleYear !== null && newerVisibleYear > currentYear;
          // The running balance already carries every kind of credit forward, so
          // the opening line is simply the balance standing before this stay.
          const receiptCreditMovedToOpeningBalance = 0;
          const displayedPreviousBalance = stayData.previousBalance;
          const checkInDate = parseDateOnly(reservation.start_date);
          const checkOutDate = parseDateOnly(reservation.end_date);

          return (
            <div key={reservation.id}>
            {selectedYear !== 0 && showReceiptYearBoundary && receiptCarry > 0.004 && (
              <div className="mb-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  Credit carried into {currentYear}:
                  <span className="ml-2 font-bold text-green-600">
                    +${receiptCarry.toFixed(2)}
                  </span>
                </span>
                {displayReservations.some(item => getLedgerKey(item.reservation) !== hostKey) && (
                  <span className="text-muted-foreground">{getTransferDisplayName(hostKey)}</span>
                )}
              </div>
            )}
            <Card>

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
                        const isPending = stayData.billingAmount === 0 && !stayData.hasOccupancyData;
                        const isPaid = stayData.amountDue <= 0;
                        const isPartial = !isPaid && stayData.amountPaid > 0;
                        return (
                          <Badge variant={isPending ? 'secondary' : isPaid ? 'default' : isPartial ? 'secondary' : 'destructive'}>
                            {isPending ? 'Not checked out' : isPaid ? 'paid' : isPartial ? 'partial' : 'Pending payment'}
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

                  {/* Right Column - Financial Summary (simple chronological ledger) */}
                  <div className="space-y-2">
                    {/* Previous Balance — always shown so the ledger reads top-to-bottom */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {displayedPreviousBalance < -0.004 ? 'Previous Balance (Credit):' : 'Previous Balance:'}
                      </span>
                      <span className={`font-medium ${displayedPreviousBalance > 0 ? 'text-destructive' : displayedPreviousBalance < 0 ? 'text-green-600' : ''}`}>
                        {displayedPreviousBalance < 0 ? '+' : ''}${Math.abs(displayedPreviousBalance).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Charges{stayData.nights ? ` (${stayData.nights} ${stayData.nights === 1 ? 'night' : 'nights'})` : ''}:
                      </span>
                      <span className="font-medium">${stayData.billingAmount.toFixed(2)}</span>
                    </div>

                    {stayData.manualAdjustment !== 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Manual Adjustment:</span>
                          <span className={`font-medium ${stayData.manualAdjustment > 0 ? 'text-amber-600' : ''}`}>
                            {stayData.manualAdjustment > 0 ? '+' : ''}${stayData.manualAdjustment.toFixed(2)}
                          </span>
                        </div>
                        {stayData.adjustmentNotes && (
                          <div className="text-sm text-muted-foreground italic pl-2 border-l-2 border-muted">
                            {stayData.adjustmentNotes}
                          </div>
                        )}
                      </>
                    )}

                    {(() => {
                      const paymentsTotal = Math.max(0, stayData.amountPaid || 0);
                      const displayedReceipts = Math.max(
                        0,
                        (stayData.receiptsTotal || 0) - receiptCreditMovedToOpeningBalance
                      );
                      const receiptsAppliedHere = Math.max(
                        0,
                        Math.min(displayedReceipts, (stayData.receiptsApplied || 0) - (stayData.carriedInReceipt || 0))
                      );
                      const receiptsLeftOver = Math.max(0, displayedReceipts - receiptsAppliedHere);
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Payments (cash / check / venmo):</span>
                            <span className="font-medium">
                              {paymentsTotal > 0.004 ? `−$${paymentsTotal.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          {(stayData.paymentOverflow || 0) > 0.004 && (
                            <div className="text-xs text-muted-foreground italic text-right -mt-1">
                              Applied ${(stayData.paidApplied || 0).toFixed(2)} to this stay, $
                              {stayData.paymentOverflow.toFixed(2)} available for later stays
                            </div>
                          )}

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Receipt Credits Submitted:</span>
                            <span className="font-medium">
                              {displayedReceipts > 0.004 ? `−$${displayedReceipts.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          {receiptsLeftOver > 0.004 && (
                            <div className="text-xs text-muted-foreground italic text-right -mt-1">
                              Applied ${receiptsAppliedHere.toFixed(2)} to this stay, $
                              {receiptsLeftOver.toFixed(2)} available for later stays
                            </div>
                          )}
                          {(yearEndReceiptsByReservation.get(reservation.id) || 0) > 0.004 && (
                            <div className="text-xs text-muted-foreground italic text-right -mt-1">
                              Includes $
                              {(yearEndReceiptsByReservation.get(reservation.id) || 0).toFixed(2)} in receipts turned in
                              after this stay but before the end of {currentYear}
                            </div>
                          )}
                          {(stayData.carriedInPayment || 0) + (stayData.carriedInReceipt || 0) > 0.004 && (
                            <div className="text-xs text-muted-foreground italic text-right -mt-1">
                              Previous balance covered $
                              {((stayData.carriedInPayment || 0) + (stayData.carriedInReceipt || 0)).toFixed(2)} of
                              this stay
                            </div>
                          )}
                          {stayData.receiptsApplied - (stayData.carriedInReceipt || 0) > (stayData.receiptsTotal || 0) + 0.004 && (
                            <div className="text-xs text-muted-foreground italic text-right -mt-1">
                              Includes credit applied from a later stay's receipts
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {(stayData.carriedInTransfer || 0) > 0.004 && (
                      <div className="text-xs text-muted-foreground italic text-right -mt-1">
                        Includes transferred credit {stayData.carriedInTransfers.map((t: any, i: number) => (
                          `${i > 0 ? ', ' : ''}$${t.amount.toFixed(2)} from ${t.fromName}${t.notes ? ` (${t.notes})` : ''}`
                        )).join('')}
                      </div>
                    )}


                    {(() => {
                      const bal = stayData.amountDue;
                      const isCredit = bal < 0;
                      const label = isLastVisible
                        ? (isCredit ? 'Current Balance (Credit):' : 'Current Balance:')
                        : (isCredit ? 'New Balance (Credit):' : 'New Balance:');
                      return (
                        <div className={`flex justify-between text-sm border-t pt-2 ${isLastVisible ? 'bg-muted/40 -mx-2 px-2 py-2 rounded' : ''}`}>
                          <span className="font-semibold">{label}</span>
                          <span className={`font-bold ${bal > 0 ? 'text-destructive' : isCredit ? 'text-green-600' : ''}`}>
                            {isCredit ? '+' : ''}${Math.abs(bal).toFixed(2)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Credit Applied Confirmation */}
                {stayData.creditAppliedToFuture && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      <h4 className="text-base font-medium">Credit Options</h4>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Credit applied to future reservations
                        </p>
                      </div>
                      {(() => {
                        const hostKey = getLedgerKey(reservation);
                        const canTransfer = canTransferForHostKey(hostKey);
                        if (!canTransfer || stayData.amountDue >= -0.004) return null;
                        return (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setTransferDialogSourceKey(hostKey);
                              setTransferDialogSourceLabel(getTransferDisplayName(hostKey));
                              setTransferDialogCredit(Math.abs(stayData.amountDue));
                              setTransferDialogOpen(true);
                            }}
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Transfer Credit to Another Member
                          </Button>
                        );
                      })()}
                      {financialSettings?.venmo_handle && stayData.amountDue < -0.004 && (
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
                      )}
                    </div>
                  </div>
                )}

                {/* Venmo Payment Section - Only show on newest stay (green Credit Options box covers credit-applied stays) */}
                {financialSettings?.venmo_handle && stayData.amountDue !== 0 && !stayData.creditAppliedToFuture &&
                  lastReservationByHost.get(getLedgerKey(reservation)) === reservation.id && (
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

                          {(() => {
                            const hostKey = getLedgerKey(reservation);
                            const canTransfer = canTransferForHostKey(hostKey);
                            if (!canTransfer) return null;
                            return (
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setTransferDialogSourceKey(hostKey);
                                  setTransferDialogSourceLabel(getTransferDisplayName(hostKey));
                                  setTransferDialogCredit(Math.abs(stayData.amountDue));
                                  setTransferDialogOpen(true);
                                }}
                              >
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Transfer Credit to Another Member
                              </Button>
                            );
                          })()}
                        </div>
                      ) : (
                        // Positive balance - show pay now button
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-base font-medium">{financialSettings.venmo_handle}</p>
                              <p className="text-sm text-muted-foreground">
                                Amount: ${stayData.amountDue.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex flex-col">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setVenmoPrecheckStay({
                                  ...reservation,
                                  paymentId: stayData.paymentId,
                                  amountDue: stayData.amountDue
                                })}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Pay Now Via Venmo
                              </Button>
                              {stayData.paymentId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50 w-full whitespace-normal"
                                  onClick={() => {
                                    setRecordPaymentDefaultMethod('venmo');
                                    setRecordPaymentStay({
                                      ...reservation,
                                      paymentId: stayData.paymentId,
                                      amountDue: stayData.amountDue,
                                    });
                                  }}
                                >
                                  Already paid Venmo outside CabinBuddy? Record it.
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {stayData.paymentId && stayData.amountDue > 0 && (
                      <OtherPaymentOptionsButton
                        onClick={() => setRecordPaymentStay({
                          ...reservation,
                          paymentId: stayData.paymentId,
                          amountDue: stayData.amountDue,
                        })}
                      />
                    )}
                  </div>
                )}

                {/* Other payment options when no Venmo card is shown — newest stay per person only */}
                {!(financialSettings?.venmo_handle && stayData.amountDue !== 0 && !stayData.creditAppliedToFuture &&
                  lastReservationByHost.get(getLedgerKey(reservation)) === reservation.id) &&
                  lastReservationByHost.get(getLedgerKey(reservation)) === reservation.id &&
                  stayData.paymentId && stayData.amountDue > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <OtherPaymentOptionsButton
                      onClick={() => setRecordPaymentStay({
                        ...reservation,
                        paymentId: stayData.paymentId,
                        amountDue: stayData.amountDue,
                      })}
                    />
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
                        // Total charge for the stay, including any manual adjustment.
                        // The split dialog spreads this across guest-nights, so it must
                        // be the full charge (fees included), not the base rate alone.
                        billingAmount: (stayData.billingAmount || 0) + (stayData.manualAdjustment || 0),
                        user_id: reservation.user_id,
                        organization_id: reservation.organization_id,
                        reservationHolderName: getHostFullName(reservation)
                      })}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit/Split Occupancy
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


                   {stayData.paymentId && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setViewPaymentHistory({
                         paymentId: stayData.paymentId,
                         familyGroup: reservation.family_group,
                         totalAmount: stayData.billingAmount + stayData.manualAdjustment,
                         receiptsCredited: stayData.receiptsApplied,
                         receiptsCount: stayData.receiptsCount,
                         balanceAfterStay: stayData.amountDue
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
            {selectedYear === 0 && showReceiptYearBoundary && receiptCarry > 0.004 && (
              <div className="my-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  Credit carried into {currentYear}:
                  <span className="ml-2 font-bold text-green-600">
                    +${receiptCarry.toFixed(2)}
                  </span>
                </span>
                {displayReservations.some(item => getLedgerKey(item.reservation) !== hostKey) && (
                  <span className="text-muted-foreground">{getTransferDisplayName(hostKey)}</span>
                )}
              </div>
            )}
          </div>
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
            fetchPayments(1, 500);
            fetchPaymentSplits();
            refetchReservations();
            setEditOccupancyStay(null);
          }}
        />
      )}

      {recordPaymentStay && (
        <RecordPaymentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setRecordPaymentStay(null);
              setRecordPaymentDefaultMethod(undefined);
            }
          }}
          title="Other Payment Options"
          venmoAlreadySent
          defaultMethod={recordPaymentDefaultMethod}
          methods={paymentMethods}
          paymentInfo={{
            checkPayableTo: financialSettings?.check_payable_to || undefined,
            checkAddress: financialSettings?.check_mailing_address || undefined,
            paypalEmail: financialSettings?.paypal_email || undefined,
          }}

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
          receiptsCredited={viewPaymentHistory.receiptsCredited}
          receiptsCount={viewPaymentHistory.receiptsCount}
          balanceAfterStay={viewPaymentHistory.balanceAfterStay}
          onPaymentUpdated={async () => {
            await fetchPayments(1, 500);
          }}
        />
      )}

      {showExportDialog && (
        <ExportSeasonDataDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          seasonData={exportSeasonData}
          year={selectedYear}
          isAdminView={isAdmin}
        />
      )}

      {/* Ask first, so nobody who already sent money pays a second time */}
      <Dialog open={!!venmoPrecheckStay} onOpenChange={(open) => !open && setVenmoPrecheckStay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Have you already sent this payment in Venmo?</DialogTitle>
            <DialogDescription>
              If you already sent ${venmoPrecheckStay?.amountDue?.toFixed(2)} on your own, record it here
              instead of opening Venmo again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-4">
            <Button
              onClick={() => {
                const stayToPay = venmoPrecheckStay;
                setVenmoPrecheckStay(null);
                if (!stayToPay || !financialSettings?.venmo_handle) return;
                const cleanHandle = financialSettings.venmo_handle.replace('@', '');
                const venmoUrl = `https://venmo.com/${cleanHandle}?txn=pay&amount=${stayToPay.amountDue.toFixed(2)}&note=${encodeURIComponent('Cabin stay payment')}`;
                window.open(venmoUrl, '_blank');
                setVenmoConfirmStay(stayToPay);
              }}
            >
              No — open Venmo
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRecordPaymentDefaultMethod('venmo');
                setRecordPaymentStay(venmoPrecheckStay);
                setVenmoPrecheckStay(null);
              }}
            >
              Yes — record the payment I already sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              setRecordPaymentDefaultMethod('venmo');
              setRecordPaymentStay(venmoConfirmStay);
              setVenmoConfirmStay(null);
            }}>
              Yes, I've Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransferCreditDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        sourceKey={transferDialogSourceKey}
        sourceLabel={transferDialogSourceLabel}
        availableCredit={transferDialogCredit}
        familyGroups={familyGroups || []}
        isAdmin={!!isAdmin}
        scope={transferScope}
        scopeGroupName={leadGroupName}
        currentUserKey={currentUserLedgerKey}
        creditBySource={Object.fromEntries(hostCreditMap)}
        onTransfer={async ({ from_ledger_name, to_ledger_name, amount, transfer_date, notes }) => {
          const result = await createTransfer({
            from_ledger_name,
            to_ledger_name,
            amount,
            transfer_date,
            notes,
          });
          if (result) {
            toast.success('Credit transferred successfully');
            await refetchTransfers();
            await fetchPayments(1, 500);
            setTransferDialogOpen(false);
          }
        }}
      />
    </div>
  );
}
