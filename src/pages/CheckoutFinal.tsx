import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, DollarSign, Users, Calendar, CreditCard, Send, FileText, CheckCircle, Circle, TrendingUp, History, Clock, CalendarDays, Edit3, Plus, Trash2, ChevronUp, ChevronDown, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useCheckinSessions, useSurveyResponses } from "@/hooks/useChecklistData";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useReceipts } from "@/hooks/useReceipts";
import { useReservations } from "@/hooks/useReservations";
import { BillingCalculator } from "@/lib/billing-calculator";
import { EarlyCheckoutDialog } from "@/components/EarlyCheckoutDialog";
import { useCheckoutBilling } from "@/hooks/useCheckoutBilling";
import { useDailyOccupancySync } from "@/hooks/useDailyOccupancySync";
import { useToast } from "@/hooks/use-toast";
import { parseDateOnly } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";
import { GuestCostSplitDialog } from "@/components/GuestCostSplitDialog";
import { useOrganization } from "@/hooks/useOrganization";
import { useProfileClaiming } from "@/hooks/useProfileClaiming";
import { useAuth } from "@/contexts/AuthContext";
import { getHostFirstName } from "@/lib/reservation-utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserSplit {
  userId: string;
  familyGroup: string;
  displayName: string;
  dailyGuests: Record<string, number>;
  costBreakdown: {
    baseAmount: number;
    cleaningFee: number;
    petFee: number;
    subtotal: number;
    tax: number;
    damageDeposit: number;
    total: number;
    details: string;
  };
}

const CheckoutFinal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { claimedProfile } = useProfileClaiming();
  const { sessions, loading: sessionsLoading } = useCheckinSessions();
  const { responses: surveyResponses, loading: surveyLoading } = useSurveyResponses();
  const { settings: financialSettings, loading: financialLoading } = useFinancialSettings();
  const { receipts, loading: receiptsLoading } = useReceipts();
  const { reservations, loading: reservationsLoading } = useReservations();

  // Check checkout list completion
  const [checklistStatus, setChecklistStatus] = useState<{
    isComplete: boolean;
    completedAt: string | null;
    totalTasks: number;
    completedTasks: number;
  } | null>(null);

  // Early checkout dialog state
  const [earlyCheckoutOpen, setEarlyCheckoutOpen] = useState(false);
  
  // Guest cost split dialog state
  const [splitCostsOpen, setSplitCostsOpen] = useState(false);
  const [editedOccupancy, setEditedOccupancy] = useState<Record<string, number>>({});
  const [paymentCreated, setPaymentCreated] = useState(false);
  
  // Split mode state
  const [splitMode, setSplitMode] = useState(false);
  const [splitUsers, setSplitUsers] = useState<UserSplit[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{
    userId: string;
    email: string;
    displayName: string;
    familyGroup: string;
  }>>([]);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [sourceDailyGuests, setSourceDailyGuests] = useState<Record<string, number>>({});
  
  const { organization } = useOrganization();
  const { updateOccupancy, syncing: syncingOccupancy } = useDailyOccupancySync(organization?.id || '');
  
  // Check if there are unsaved occupancy changes
  const hasOccupancyChanges = Object.keys(editedOccupancy).length > 0;
  
  // Fetch available users for split
  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchAvailableUsers();
    }
  }, [organization?.id, user?.id]);

  const fetchAvailableUsers = async () => {
    if (!organization?.id || !user?.id) return;

    const { data, error } = await supabase
      .rpc('get_organization_user_emails', { org_id: organization.id });

    if (error) {
      console.error('Failed to fetch organization users:', error);
      return;
    }

    // Get family groups
    const { data: familyGroups } = await supabase
      .from('family_groups')
      .select('name, lead_email, host_members')
      .eq('organization_id', organization.id);

    // Filter out current user and enrich with family group info
    const enrichedUsers = (data?.filter((u: any) => u.user_id !== user.id) || []).map((u: any) => {
      const userFamilyGroup = familyGroups?.find(fg => {
        if (fg.lead_email?.toLowerCase() === u.email?.toLowerCase()) return true;
        if (fg.host_members && Array.isArray(fg.host_members)) {
          return fg.host_members.some((hm: any) => 
            hm.email?.toLowerCase() === u.email?.toLowerCase()
          );
        }
        return false;
      });

      return {
        userId: u.user_id,
        email: u.email,
        displayName: u.display_name || u.email,
        familyGroup: userFamilyGroup?.name || 'Unknown'
      };
    });

    setAvailableUsers(enrichedUsers);
  };
  
  const { isAdmin } = useOrgAdmin();

  // Get the most recent reservation for the current user's stay
  // Prioritize reservations that include today's date (active stays)
  const getCurrentUserReservation = () => {
    if (!user) return undefined;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userReservations = reservations.filter(r => {
      // Only show confirmed reservations
      if (r.status !== 'confirmed') return false;
      
      // If it's a transferred-out reservation, don't show it for checkout (original person already checked out)
      if (r.transfer_type === 'transferred_out') return false;
      
      // Filter by user - check if this reservation belongs to the logged-in user
      // Option 1: If user has claimed a profile, match by family group and host name
      if (claimedProfile) {
        // Check if reservation belongs to user's claimed family group
        if (r.family_group !== claimedProfile.family_group_name) return false;
        
        // Check if user is the host of this reservation
        // For host assignments, check if user's claimed name matches OR email matches
        if (r.host_assignments && Array.isArray(r.host_assignments) && r.host_assignments.length > 0) {
          const userIsHost = r.host_assignments.some(host => 
            host.host_name === claimedProfile.member_name || 
            host.host_email?.toLowerCase() === user.email?.toLowerCase()
          );
          if (userIsHost) return true;
        }
        
        // Fallback: if no host assignments, user must be group lead and reservation must be for their group
        return claimedProfile.member_type === 'group_lead';
      }
      
      // Option 2: Check if user's email matches any host in host_assignments (works without claiming profile)
      if (r.host_assignments && Array.isArray(r.host_assignments) && r.host_assignments.length > 0) {
        const userIsHost = r.host_assignments.some(host => 
          host.host_email?.toLowerCase() === user.email?.toLowerCase()
        );
        if (userIsHost) return true;
      }
      
      // Option 3: If no claimed profile and not in host assignments, match by user_id (fallback for legacy data)
      return r.user_id === user.id;
    });
    
    // First, try to find an active reservation (today is between start and end date)
    const activeReservation = userReservations.find(r => {
      const startDate = parseDateOnly(r.start_date);
      const endDate = parseDateOnly(r.end_date);
      return today >= startDate && today <= endDate;
    });
    
    if (activeReservation) return activeReservation;
    
    // If no active reservation, find the most recent past reservation (for post-stay checkout)
    const pastReservations = userReservations.filter(r => {
      const endDate = parseDateOnly(r.end_date);
      return today > endDate;
    });
    
    // Sort by end date descending (most recently ended first)
    const mostRecentPast = pastReservations.sort((a, b) => 
      parseDateOnly(b.end_date).getTime() - parseDateOnly(a.end_date).getTime()
    )[0];
    
    // If the most recent past reservation ended more than 7 days ago, show sample data instead
    if (mostRecentPast) {
      const endDate = parseDateOnly(mostRecentPast.end_date);
      const daysSinceCheckout = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCheckout > 7) {
        return undefined; // Show sample data
      }
    }
    
    return mostRecentPast;
  };

  const currentReservation = getCurrentUserReservation();

  // Helper function to check if user owns a reservation (for split costs button)
  const isUserReservationOwner = (reservation: any): boolean => {
    if (!user) return false;
    
    // Option 1: If user has claimed a profile, check permissions
    if (claimedProfile) {
      // Family group leads can split costs on any reservation in their group
      if (claimedProfile.member_type === 'group_lead' && 
          reservation.family_group === claimedProfile.family_group_name) {
        return true;
      }
      
      // Otherwise, check if they're the primary host
      if (reservation.family_group === claimedProfile.family_group_name &&
          reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
        const primaryHost = reservation.host_assignments[0];
        return primaryHost.host_name === claimedProfile.member_name;
      }
    }
    
    // Option 2: Check if user's email matches any host in host_assignments
    if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
      return reservation.host_assignments.some(host => 
        host.host_email?.toLowerCase() === user.email?.toLowerCase()
      );
    }
    
    // Option 3: Fallback to user_id match (legacy)
    return reservation.user_id === user.id;
  };

  // Generate sample data when no reservation exists (for preview/demo)
  const generateSampleData = () => {
    const today = new Date();
    const sampleStart = new Date(today.getFullYear(), 10, 2); // Nov 2
    const sampleEnd = new Date(today.getFullYear(), 10, 6); // Nov 6 (4 nights)
    
    return {
      checkInDate: sampleStart,
      checkOutDate: sampleEnd,
      guests: 4,
      nights: 4,
      receiptsTotal: 0,
      isSample: true
    };
  };

  // Generate a sample reservation for preview mode
  const generateSampleReservation = () => {
    const today = new Date();
    const sampleStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
    const sampleEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
    
    return {
      id: 'sample-reservation',
      start_date: sampleStart.toISOString().split('T')[0],
      end_date: sampleEnd.toISOString().split('T')[0],
      family_group: 'Sample Family',
      guest_count: 4,
      total_cost: 450,
      property_name: 'Sample Cabin'
    };
  };

  const sampleReservation = generateSampleReservation();

  // Load checkout completion status from database and localStorage
  useEffect(() => {
    const loadCheckoutStatus = async () => {
      console.log('🔍 [CHECKOUT-STATUS] Loading checkout status...');
      console.log('🔍 [CHECKOUT-STATUS] Current reservation:', {
        id: currentReservation?.id,
        family_group: currentReservation?.family_group,
        start_date: currentReservation?.start_date,
        end_date: currentReservation?.end_date
      });

      // First check localStorage for quick access
      const familyData = localStorage.getItem('familySetupData');
      console.log('🔍 [CHECKOUT-STATUS] Family data from localStorage:', familyData);
      
      if (familyData) {
        const { organizationCode } = JSON.parse(familyData);
        console.log('🔍 [CHECKOUT-STATUS] Organization code:', organizationCode);
        
        const savedCompletion = localStorage.getItem(`checkout_completion_${organizationCode}`);
        console.log('🔍 [CHECKOUT-STATUS] Saved completion from localStorage:', savedCompletion);
        
        if (savedCompletion) {
          const localStatus = JSON.parse(savedCompletion);
          setChecklistStatus(localStatus);
          console.log('✅ [CHECKOUT-STATUS] Loaded from localStorage:', localStatus);
        } else {
          console.log('⚠️ [CHECKOUT-STATUS] No saved completion in localStorage');
        }
      } else {
        console.log('⚠️ [CHECKOUT-STATUS] No family data in localStorage');
      }

      // Then check database for the most recent checkout session
      if (currentReservation) {
        try {
          console.log('🔍 [CHECKOUT-STATUS] Querying database for checkout session...');
          const { data: checkoutSession, error } = await supabase
            .from('checkin_sessions')
            .select('*')
            .eq('session_type', 'checkout')
            .eq('family_group', currentReservation.family_group)
            .gte('check_date', currentReservation.start_date)
            .lte('check_date', currentReservation.end_date)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          console.log('🔍 [CHECKOUT-STATUS] Database query result:', { checkoutSession, error });

          if (error) {
            console.error('❌ [CHECKOUT-STATUS] Database query error:', error);
          } else if (!checkoutSession) {
            console.log('⚠️ [CHECKOUT-STATUS] No checkout session found in database');
          } else if (!checkoutSession.checklist_responses) {
            console.log('⚠️ [CHECKOUT-STATUS] Checkout session found but no checklist_responses');
          } else {
            const responses = checkoutSession.checklist_responses as any;
            const checklistCompletion = responses?.checklistCompletion;
            console.log('🔍 [CHECKOUT-STATUS] Checklist completion from DB:', checklistCompletion);
            
            if (checklistCompletion) {
              const dbStatus = {
                isComplete: checklistCompletion.isComplete || false,
                completedAt: checklistCompletion.completedAt || null,
                totalTasks: checklistCompletion.totalTasks || 0,
                completedTasks: checklistCompletion.completedTasks || 0,
              };
              setChecklistStatus(dbStatus);
              console.log('✅ [CHECKOUT-STATUS] Loaded from database:', dbStatus);
              
              // Also sync to localStorage for next time
              if (familyData) {
                const { organizationCode } = JSON.parse(familyData);
                localStorage.setItem(`checkout_completion_${organizationCode}`, JSON.stringify(dbStatus));
                console.log('✅ [CHECKOUT-STATUS] Synced to localStorage');
              }
            } else {
              console.log('⚠️ [CHECKOUT-STATUS] No checklistCompletion in responses');
            }
          }
        } catch (error) {
          console.error('❌ [CHECKOUT-STATUS] Failed to load from database:', error);
        }
      } else {
        console.log('⚠️ [CHECKOUT-STATUS] No current reservation, skipping database check');
      }
    };

    loadCheckoutStatus();
  }, [currentReservation?.id, currentReservation?.family_group, currentReservation?.start_date, currentReservation?.end_date]);

  // Calculate stay dates from the current reservation, or use sample data
  const isSampleMode = !currentReservation;
  const sampleData = isSampleMode ? generateSampleData() : null;
  const checkInDate = currentReservation ? parseDateOnly(currentReservation.start_date) : (sampleData?.checkInDate || null);
  const checkOutDate = currentReservation ? parseDateOnly(currentReservation.end_date) : (sampleData?.checkOutDate || null);
  
  // Filter sessions for the current stay period (exclude checkout day)
  const arrivalSessions = sessions.filter(s => s.session_type === 'arrival');
  const dailySessions = sessions
    .filter(s => s.session_type === 'daily')
    .filter(s => {
      if (!checkInDate || !checkOutDate) return false;
      const sessionDate = parseDateOnly(s.check_date);
      return sessionDate >= checkInDate && sessionDate < checkOutDate;
    })
    .sort((a, b) => parseDateOnly(a.check_date).getTime() - parseDateOnly(b.check_date).getTime());

  // Calculate receipts total for the stay period (only user's own receipts)
  const calculateReceiptsTotal = () => {
    if (!checkInDate || !checkOutDate || !user) return 0;
    
    return receipts
      .filter(receipt => {
        const receiptDate = parseDateOnly(receipt.date);
        return receipt.user_id === user.id && 
               receiptDate >= checkInDate && 
               receiptDate <= checkOutDate;
      })
      .reduce((total, receipt) => total + receipt.amount, 0);
  };

  const receiptsTotal = calculateReceiptsTotal();

  // Calculate previous balance from prior reservations
  const [previousBalance, setPreviousBalance] = useState<number>(0);

  useEffect(() => {
    const calculatePreviousBalance = async () => {
      if (!user || !currentReservation || !organization?.id) return;

      try {
        // Get all prior reservations for this user (before current reservation's start date)
        const priorReservations = reservations.filter(r => {
          // Only confirmed reservations
          if (r.status !== 'confirmed') return false;
          
          // Only past reservations (before current stay)
          if (parseDateOnly(r.start_date) >= parseDateOnly(currentReservation.start_date)) return false;
          
          // Match by user - same logic as getCurrentUserReservation
          if (claimedProfile) {
            if (r.family_group !== claimedProfile.family_group_name) return false;
            if (r.host_assignments && Array.isArray(r.host_assignments) && r.host_assignments.length > 0) {
              const primaryHost = r.host_assignments[0];
              return primaryHost.host_name === claimedProfile.member_name;
            }
            return claimedProfile.member_type === 'group_lead';
          }
          
          if (r.host_assignments && Array.isArray(r.host_assignments) && r.host_assignments.length > 0) {
            const userIsHost = r.host_assignments.some(host => 
              host.host_email?.toLowerCase() === user.email?.toLowerCase()
            );
            if (userIsHost) return true;
          }
          
          return r.user_id === user.id;
        });

        // For each prior reservation, calculate: billing - payments - receipts
        let runningBalance = 0;
        
        for (const reservation of priorReservations.sort((a, b) => 
          parseDateOnly(a.start_date).getTime() - parseDateOnly(b.start_date).getTime()
        )) {
          // Find payment for this reservation
          const { data: payment } = await supabase
            .from('payments')
            .select('amount, amount_paid')
            .eq('reservation_id', reservation.id)
            .eq('organization_id', organization.id)
            .maybeSingle();

      // Find receipts ONLY for this specific reservation's date range
      const familyReceipts = receipts.filter(r => 
        r.family_group === reservation.family_group &&
        parseDateOnly(r.date) >= parseDateOnly(reservation.start_date) &&
        parseDateOnly(r.date) <= parseDateOnly(reservation.end_date)
      );
          const receiptsTotal = familyReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

          if (payment) {
            const billing = Number(payment.amount) || 0;
            const paid = Number(payment.amount_paid) || 0;
            runningBalance += (billing - paid - receiptsTotal);
          }
        }

        setPreviousBalance(runningBalance);
      } catch (error) {
        console.error('Failed to calculate previous balance:', error);
      }
    };

    calculatePreviousBalance();
  }, [user, currentReservation, reservations, receipts, organization?.id, claimedProfile]);

  // Calculate number of nights (only nights spent, not checkout day)
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  };

  // Build checkout data from actual reservation data or sample data
  const checkoutData = {
    guests: currentReservation?.guest_count || sampleData?.guests || 0,
    nights: calculateNights(),
    receiptsTotal: sampleData ? 0 : receiptsTotal,
    checkInDate: checkInDate?.toISOString().split('T')[0] || '',
    checkOutDate: checkOutDate?.toISOString().split('T')[0] || '',
    venmoHandle: financialSettings?.venmo_handle || '',
    paypalEmail: financialSettings?.paypal_email || '',
    checkAddress: {
      name: financialSettings?.check_payable_to || '',
      address: financialSettings?.check_mailing_address || ''
    },
    isSample: isSampleMode
  };

  const calculateBilling = () => {
    // If no financial settings or no reservation data, return empty billing
    if (!financialSettings || !currentReservation || checkoutData.nights === 0) {
      return {
        baseAmount: 0,
        cleaningFee: 0,
        petFee: 0,
        damageDeposit: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        details: 'No stay data available'
      };
    }

    const billingConfig = {
      method: financialSettings.billing_method as any,
      amount: financialSettings.billing_amount,
      taxRate: financialSettings.tax_rate,
      cleaningFee: financialSettings.cleaning_fee,
      petFee: financialSettings.pet_fee,
      damageDeposit: financialSettings.damage_deposit,
    };

    const stayDetails = {
      guests: checkoutData.guests,
      nights: checkoutData.nights,
      weeks: Math.ceil(checkoutData.nights / 7),
      checkInDate: parseDateOnly(checkoutData.checkInDate),
      checkOutDate: parseDateOnly(checkoutData.checkOutDate),
    };

    return BillingCalculator.calculateStayBilling(billingConfig, stayDetails);
  };

  // Use new billing hook for daily occupancy
  const billingConfig = financialSettings ? {
    method: financialSettings.billing_method as any,
    amount: financialSettings.billing_amount,
    taxRate: financialSettings.tax_rate,
    cleaningFee: financialSettings.cleaning_fee,
    petFee: financialSettings.pet_fee,
    damageDeposit: financialSettings.damage_deposit,
  } : null;

  const { 
    dailyBreakdown, 
    billing: enhancedBilling, 
    totalDays,
    totalGuests,
    loading: billingLoading,
    billingLocked,
    previousCredit,
    refetch,
    createDeferredPayment,
    createSplitPayment 
  } = useCheckoutBilling(
    currentReservation?.id,
    checkInDate,
    checkOutDate,
    checkoutData.guests,
    billingConfig
  );

  const billing = calculateBilling();
  const totalAmount = enhancedBilling.total - checkoutData.receiptsTotal + previousBalance;

  // Calculate split cost breakdowns - stable function
  const calculateSplitCostBreakdowns = useCallback((splitData: any[]): UserSplit[] => {
    if (!financialSettings || !checkInDate || !checkOutDate) return [];
    
    const billingConfig = {
      method: financialSettings.billing_method,
      amount: financialSettings.billing_amount,
      taxRate: financialSettings.tax_rate || 0,
      cleaningFee: financialSettings.cleaning_fee || 0,
      petFee: financialSettings.pet_fee || 0,
      damageDeposit: financialSettings.damage_deposit || 0,
    };

    // Calculate total guest nights across all users
    const allTotalGuestNights = dailyBreakdown.reduce((sum, day) => sum + day.guests, 0);

    return splitData.map(user => {
      // Convert daily guests to the format BillingCalculator expects
      const dailyOccupancyData: Record<string, number> = user.dailyGuests;
      
      // Calculate billing using the same method as main billing
      const stayDates = {
        startDate: checkInDate,
        endDate: checkOutDate
      };
      
      const userBilling = BillingCalculator.calculateFromDailyOccupancy(
        billingConfig,
        dailyOccupancyData,
        stayDates
      );

      // Prorate cleaning fee, pet fee, and damage deposit based on guest nights
      const totalGuestNights = Object.values(dailyOccupancyData).reduce((sum, guests) => sum + guests, 0);
      const userProportion = allTotalGuestNights > 0 ? totalGuestNights / allTotalGuestNights : 0;

      const proratedCleaningFee = billingConfig.cleaningFee * userProportion;
      const proratedPetFee = billingConfig.petFee * userProportion;
      const proratedDamageDeposit = billingConfig.damageDeposit * userProportion;

      const subtotal = userBilling.baseAmount + proratedCleaningFee + proratedPetFee;
      const tax = billingConfig.taxRate ? (subtotal * billingConfig.taxRate) / 100 : 0;
      const total = subtotal + tax + proratedDamageDeposit;

      return {
        userId: user.userId,
        familyGroup: user.familyGroup,
        displayName: user.displayName,
        dailyGuests: user.dailyGuests,
        costBreakdown: {
          baseAmount: userBilling.baseAmount,
          cleaningFee: proratedCleaningFee,
          petFee: proratedPetFee,
          subtotal,
          tax,
          damageDeposit: proratedDamageDeposit,
          total,
          details: userBilling.details
        }
      };
    });
  }, [financialSettings, checkInDate, checkOutDate, dailyBreakdown]);

  // Handle guest count changes in split mode
  const handleSplitGuestCountChange = (date: string, userId: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    
    console.log('handleSplitGuestCountChange called:', { date, userId, value, numValue });
    
    // Update specific user's guest count
    setSplitUsers(prev => {
      const updated = prev.map(user => {
        if (user.userId === userId) {
          console.log('Updating user:', userId, 'date:', date, 'from', user.dailyGuests[date], 'to', numValue);
          return {
            ...user,
            dailyGuests: { ...user.dailyGuests, [date]: numValue }
          };
        }
        return user;
      });
      
      console.log('Updated splitUsers:', updated);
      
      // Recalculate costs for all users with updated guest counts
      return calculateSplitCostBreakdowns(updated);
    });
  };

  // Calculate source user's breakdown
  const sourceUserBreakdown = useMemo(() => {
    if (!splitMode || !financialSettings || !checkInDate || !checkOutDate) return null;
    
    const sourceData = {
      userId: user?.id || 'source',
      familyGroup: claimedProfile?.family_group_name || currentReservation?.family_group || '',
      displayName: 'You',
      dailyGuests: sourceDailyGuests
    };
    
    const calculated = calculateSplitCostBreakdowns([sourceData]);
    return calculated[0] || null;
  }, [splitMode, financialSettings, checkInDate, checkOutDate, sourceDailyGuests, user?.id, claimedProfile, currentReservation, calculateSplitCostBreakdowns]);

  // Create deferred payment for a specific user in split mode
  const createDeferredPaymentForUser = async (
    userId: string,
    familyGroup: string,
    displayName: string,
    amount: number,
    dailyOccupancy: Record<string, number>
  ) => {
    if (!currentReservation || !organization) return;

    try {
      setIsCreatingPayment(true);

      const { error } = await supabase
        .from('payments')
        .insert([{
          organization_id: organization.organization_id,
          family_group: familyGroup,
          reservation_id: currentReservation.id,
          amount: amount,
          balance_due: amount,
          amount_paid: 0,
          payment_type: 'reservation_balance' as const,
          status: 'pending' as const,
          description: `Cabin stay - ${displayName}'s share`,
          due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
          daily_occupancy: dailyOccupancy,
          created_by_user_id: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `${displayName}'s payment of ${BillingCalculator.formatCurrency(amount)} has been added to their season balance.`,
      });

      setPaymentCreated(true);
    } catch (error: any) {
      console.error('Error creating deferred payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };


  // Calculate total of all splits for verification - memoized
  const splitTotal = useMemo((): number => {
    if (!splitMode || splitUsers.length === 0) return 0;
    
    const sourceTotal = sourceUserBreakdown?.costBreakdown.total || 0;
    const splitUsersTotal = splitUsers.reduce((sum, user) => sum + user.costBreakdown.total, 0);
    
    return sourceTotal + splitUsersTotal;
  }, [splitMode, splitUsers, sourceUserBreakdown]);

  // Render cost breakdown helper - stable function
  const renderCostBreakdown = useCallback((breakdown: UserSplit['costBreakdown'], includeReceipts: boolean = false) => (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Base rate:</span>
        <span className="font-medium">{BillingCalculator.formatCurrency(breakdown.baseAmount)}</span>
      </div>
      <div className="text-sm text-muted-foreground mb-2">
        {breakdown.details}
      </div>
      
      {breakdown.cleaningFee > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cleaning fee (prorated):</span>
          <span className="font-medium">{BillingCalculator.formatCurrency(breakdown.cleaningFee)}</span>
        </div>
      )}
      
      {breakdown.petFee > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pet fee (prorated):</span>
          <span className="font-medium">{BillingCalculator.formatCurrency(breakdown.petFee)}</span>
        </div>
      )}
      
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal:</span>
        <span className="font-medium">{BillingCalculator.formatCurrency(breakdown.subtotal)}</span>
      </div>
      
      {breakdown.tax > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax:</span>
          <span className="font-medium">{BillingCalculator.formatCurrency(breakdown.tax)}</span>
        </div>
      )}
      
      {breakdown.damageDeposit > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Damage deposit (prorated):</span>
          <span className="font-medium">{BillingCalculator.formatCurrency(breakdown.damageDeposit)}</span>
        </div>
      )}
      
      {includeReceipts && checkoutData.receiptsTotal > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Less: Receipts submitted:</span>
          <span className="font-medium text-green-600">-{BillingCalculator.formatCurrency(checkoutData.receiptsTotal)}</span>
        </div>
      )}
      
      {includeReceipts && previousCredit > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Previous Credit Applied:</span>
          <span className="font-medium text-green-600">-{BillingCalculator.formatCurrency(previousCredit)}</span>
        </div>
      )}
      
      <Separator />
      
      <div className="flex justify-between text-lg font-semibold">
        <span>Amount Due:</span>
        <span className={breakdown.total < 0 ? 'text-green-600' : 'text-primary'}>
          {BillingCalculator.formatCurrency(includeReceipts ? breakdown.total - checkoutData.receiptsTotal - previousCredit : breakdown.total)}
        </span>
      </div>
    </div>
  ), [checkoutData.receiptsTotal, previousCredit]);

  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Fetch payment ID for the current reservation
  useEffect(() => {
    const fetchPaymentId = async () => {
      if (!currentReservation?.id || !organization?.id) {
        setPaymentId(null);
        return;
      }

      try {
        const { data: payment } = await supabase
          .from('payments')
          .select('id')
          .eq('reservation_id', currentReservation.id)
          .eq('organization_id', organization.id)
          .maybeSingle();

        setPaymentId(payment?.id || null);
      } catch (error) {
        console.error('Error fetching payment ID:', error);
        setPaymentId(null);
      }
    };

    fetchPaymentId();
  }, [currentReservation?.id, organization?.id]);

  const handleSaveOccupancy = async () => {
    if (!currentReservation) return;

    const updatedOccupancy = dailyBreakdown.map(day => ({
      date: day.date,
      guests: editedOccupancy[day.date] ?? day.guests,
    }));

    const result = await updateOccupancy(currentReservation.id, updatedOccupancy);
    
    if (result.success) {
      setEditedOccupancy({});
      // Refresh billing data without full page reload
      await refetch();
    }
  };
  
  const handleCancelOccupancyEdit = () => {
    setEditedOccupancy({});
  };

  const handlePayLater = async () => {
    setIsCreatingPayment(true);
    const success = await createDeferredPayment();
    setIsCreatingPayment(false);
    
    if (success) {
      toast({
        title: "Payment Deferred",
        description: "This payment has been added to your season balance. View Season Summary to see your total.",
      });
      
      // Navigate to stay history after successful deferral
      setTimeout(() => navigate("/stay-history"), 1500);
    }
  };

  const handleApplyCreditToFuture = async () => {
    if (!paymentId || !organization?.id) {
      toast({
        title: "Error",
        description: "Unable to apply credit. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Update payment record to mark credit as applied to future
      const { error } = await supabase
        .from('payments')
        .update({
          credit_applied_to_future: true,
          notes: `Credit of ${BillingCalculator.formatCurrency(Math.abs(totalAmount))} applied to future reservations`
        })
        .eq('id', paymentId);
        
      if (error) throw error;
      
      toast({
        title: "Credit Applied!",
        description: `${BillingCalculator.formatCurrency(Math.abs(totalAmount))} will be deducted from your next season's billing.`
      });
      
      // Navigate to stay history after a brief delay
      setTimeout(() => navigate("/stay-history"), 1500);
    } catch (error: any) {
      console.error('Error applying credit:', error);
      toast({
        title: "Error",
        description: "Failed to apply credit. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Show loading state if any data is still loading
  const isLoading = sessionsLoading || surveyLoading || financialLoading || receiptsLoading || reservationsLoading || billingLoading;

  // Check if we have the necessary data to show checkout (including sample data)
  const hasStayData = (currentReservation || sampleData) && checkoutData.checkInDate && checkoutData.checkOutDate;

  // Check if early checkout is possible (reservation extends beyond today)
  const canEarlyCheckout = currentReservation && checkOutDate &&
    checkOutDate > new Date();

  const handleEarlyCheckoutComplete = () => {
    // Refresh reservations data after early checkout
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      {/* Top Navigation Bar */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/home")}
            className="hover:scale-105 hover:shadow-md hover:border-primary/50 transition-all duration-200"
          >
            <Home className="h-4 w-4" />
          </Button>
          
          {/* Center title */}
          <h1 className="text-6xl font-kaushan text-primary drop-shadow-lg">Daily & Final Check</h1>
          
          {/* Right side spacer for balance */}
          <div className="w-20"></div>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-6 -mt-2">
          <p className="text-xl font-kaushan text-primary">Complete daily tasks, review your stay, and finalize payment</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Show loading or empty state */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-base">Loading checkout data...</p>
              </div>
            </CardContent>
          </Card>
        ) : !hasStayData ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold">No Stay Data Available</h3>
                <p className="text-base text-muted-foreground">
                  No recent reservations found. Please ensure you have completed a stay to view checkout details.
                </p>
                <Button onClick={() => navigate("/")} className="text-base">
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Compact Side-by-Side Reminders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Checkout Checklist Collapsible */}
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {checklistStatus?.isComplete ? (
                            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-sm">Checkout Checklist</p>
                            {checkoutData.isSample ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Sample data - no active stay
                              </p>
                            ) : checklistStatus?.isComplete ? (
                              <Badge variant="secondary" className="mt-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                Complete
                              </Badge>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {checklistStatus 
                                  ? `${checklistStatus.completedTasks}/${checklistStatus.totalTasks} done`
                                  : 'Not started'
                                }
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      {checkoutData.isSample ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Your checkout checklist will appear here with tasks to complete before you leave
                          </p>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/checkout-list")}
                            className="w-full"
                          >
                            Preview Checklist
                          </Button>
                        </div>
                      ) : checklistStatus?.isComplete ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            All {checklistStatus.totalTasks} checklist tasks have been completed. Thank you!
                          </p>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/checkout-list")}
                            className="w-full"
                          >
                            View Checklist
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Don't forget to finish the checkout checklist before you go
                          </p>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/checkout-list")}
                            className="w-full"
                          >
                            Go to Checklist
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Early Checkout Collapsible */}
              {(canEarlyCheckout || checkoutData.isSample) && (
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-orange-600 shrink-0" />
                            <div>
                              <p className="font-medium text-sm">Early Checkout</p>
                              <Badge variant="secondary" className="mt-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                Available
                              </Badge>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-2">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {checkoutData.isSample ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                If you need to leave early, you can cancel remaining days, transfer to family, or offer to others
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setEarlyCheckoutOpen(true)}
                                className="w-full border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/20"
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Preview Early Checkout
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Your reservation continues until {checkOutDate?.toLocaleDateString()}
                              </p>
                              <p className="text-sm">
                                Cancel remaining days, transfer to family, or offer to others
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setEarlyCheckoutOpen(true)}
                                className="w-full border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/20"
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Early Checkout
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Sample Data Banner - shown when using demo data */}
            {checkoutData.isSample && (
              <div className="mb-6">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                      Sample Checkout Preview
                    </h3>
                  </div>
                  <p className="text-blue-700 dark:text-blue-300">
                    This is a preview showing what a typical checkout would look like. The dates and guest counts shown are examples.
                  </p>
                </div>
              </div>
            )}

            {/* Transferred Reservation Notice */}
            {currentReservation?.transfer_type === 'transferred_in' && (
              <Card className="mb-6 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Users className="h-5 w-5" />
                    Transferred Reservation
                  </CardTitle>
                  <CardDescription>
                    This stay was transferred to you from {currentReservation.transferred_from || 'another family member'}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your stay summary includes only the time period you are responsible for 
                    ({checkInDate?.toLocaleDateString()} - {checkOutDate?.toLocaleDateString()}).
                  </p>
                </CardContent>
              </Card>
            )}


            {/* Main checkout content - always accessible */}
            <div className="space-y-6">
              {/* Daily Occupancy Breakdown */}
              {dailyBreakdown.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Daily Occupancy & Charges
                      {billingLocked && (
                        <Badge variant="secondary" className="ml-2">
                          <Lock className="h-3 w-3 mr-1" />
                          Billing Locked
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {splitMode 
                        ? "Split mode active - edit guest counts for each person"
                        : billingLocked 
                          ? "Billing is locked - guest counts can be updated but charges are frozen"
                          : "Edit guest counts to recalculate charges"
                      }
                    </CardDescription>
                    
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
                      <Label className="text-sm font-medium">Mode:</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={!splitMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSplitMode(false);
                            setShowUserSelection(false);
                          }}
                        >
                          Simple Entry
                        </Button>
                        <Button
                          variant={splitMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            console.log('Split Costs button clicked, splitMode before:', splitMode);
                            setSplitMode(true);
                            // Initialize source daily guests from current occupancy
                            if (Object.keys(sourceDailyGuests).length === 0) {
                              const initial: Record<string, number> = {};
                              dailyBreakdown.forEach(day => {
                                initial[day.date] = editedOccupancy[day.date] ?? day.guests;
                              });
                              console.log('Initializing sourceDailyGuests:', initial);
                              setSourceDailyGuests(initial);
                            }
                            if (availableUsers.length === 0) {
                              fetchAvailableUsers();
                            }
                          }}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Split Costs
                        </Button>
                      </div>
                    </div>
                    
                    {/* User Selection for Split Mode */}
                    {splitMode && (
                      <div className="mt-4 space-y-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUserSelection(!showUserSelection)}
                          className="w-full"
                        >
                          {showUserSelection ? 'Hide' : 'Show'} User Selection
                          {showUserSelection ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                        </Button>
                        
                        {showUserSelection && (
                          <div className="border rounded-lg p-4 space-y-2 bg-background">
                            <p className="text-sm font-medium mb-2">Select people to split costs with:</p>
                            {availableUsers.map((user) => {
                              const isSelected = splitUsers.some(su => su.userId === user.userId);
                              return (
                                <div key={user.userId} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`user-${user.userId}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        const emptyDailyGuests: Record<string, number> = {};
                                        dailyBreakdown.forEach(day => {
                                          emptyDailyGuests[day.date] = 0;
                                        });
                                        setSplitUsers(prev => [...prev, {
                                          userId: user.userId,
                                          displayName: user.displayName,
                                          familyGroup: user.familyGroup,
                                          dailyGuests: emptyDailyGuests,
                                          costBreakdown: {
                                            baseAmount: 0,
                                            cleaningFee: 0,
                                            petFee: 0,
                                            subtotal: 0,
                                            tax: 0,
                                            damageDeposit: 0,
                                            total: 0,
                                            details: ''
                                          }
                                        }]);
                                      } else {
                                        setSplitUsers(prev => prev.filter(su => su.userId !== user.userId));
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor={`user-${user.userId}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {user.displayName}
                                    <span className="text-muted-foreground ml-2">({user.familyGroup})</span>
                                  </Label>
                                </div>
                              );
                            })}
                            {availableUsers.length === 0 && (
                              <p className="text-sm text-muted-foreground">Loading users...</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {!splitMode ? (
                        <>
                          {/* Simple Entry Mode */}
                          <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                            <span>Date</span>
                            <span className="text-center">Guests</span>
                            <span className="text-right">Cost</span>
                          </div>
                          {dailyBreakdown.map((day, index) => {
                            const editedGuests = editedOccupancy[day.date] ?? day.guests;
                            return (
                              <div key={index} className="grid grid-cols-3 gap-2 items-center text-sm py-1">
                                <span>{parseDateOnly(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                <div className="flex justify-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={editedGuests}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setEditedOccupancy(prev => ({
                                        ...prev,
                                        [day.date]: newValue
                                      }));
                                    }}
                                    className="w-20 h-8 text-center"
                                    disabled={paymentCreated}
                                  />
                                </div>
                                <span className="text-right font-medium">{BillingCalculator.formatCurrency(day.cost)}</span>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t mt-2">
                            <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
                              <span>Total ({totalDays} days)</span>
                              <span className="text-center">{totalGuests} guests</span>
                              <span className="text-right">{BillingCalculator.formatCurrency(enhancedBilling.baseAmount)}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Split Mode - Simple Grid Layout */}
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="grid gap-2 text-sm font-medium pb-2 border-b" style={{ gridTemplateColumns: `120px repeat(${splitUsers.length + 1}, 100px) 80px` }}>
                              <div>Date</div>
                              <div className="text-center">You</div>
                              {splitUsers.map(user => (
                                <div key={user.userId} className="text-center truncate" title={user.displayName}>
                                  {user.displayName}
                                </div>
                              ))}
                              <div className="text-center">Total</div>
                            </div>
                            
                            {/* Data Rows */}
                            {dailyBreakdown.map((day) => {
                              const sourceGuests = sourceDailyGuests[day.date] ?? (editedOccupancy[day.date] ?? day.guests);
                              const splitGuestTotals = splitUsers.reduce((sum, user) => sum + (user.dailyGuests[day.date] || 0), 0);
                              const dailyTotal = sourceGuests + splitGuestTotals;
                              const originalTotal = day.guests;
                              const isValid = dailyTotal === originalTotal;
                              
                              return (
                                <div key={day.date} className="grid gap-2 items-center py-1" style={{ gridTemplateColumns: `120px repeat(${splitUsers.length + 1}, 100px) 80px` }}>
                                  <div className="text-sm">
                                    {parseDateOnly(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="flex justify-center">
                                    <input
                                      type="number"
                                      value={sourceGuests}
                                      onInput={(e) => {
                                        const val = (e.target as HTMLInputElement).value;
                                        const newValue = parseInt(val) || 0;
                                        setSourceDailyGuests(prev => ({ ...prev, [day.date]: newValue }));
                                      }}
                                      className="w-20 h-8 text-center border rounded px-2"
                                    />
                                  </div>
                                  {splitUsers.map(user => (
                                    <div key={user.userId} className="flex justify-center">
                                      <input
                                        type="number"
                                        value={user.dailyGuests[day.date] || 0}
                                        onInput={(e) => {
                                          const val = (e.target as HTMLInputElement).value;
                                          console.log('Split user input - user:', user.displayName, 'date:', day.date, 'value entered:', val);
                                          console.log('Current dailyGuests for this user:', user.dailyGuests);
                                          handleSplitGuestCountChange(day.date, user.userId, val);
                                        }}
                                        onChange={(e) => {
                                          console.log('onChange fired for', user.displayName, e.target.value);
                                        }}
                                        className="w-20 h-8 text-center border rounded px-2"
                                      />
                                    </div>
                                  ))}
                                  <div className={`text-center text-sm font-medium ${!isValid ? 'text-destructive' : ''}`}>
                                    {dailyTotal}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {splitUsers.length === 0 && (
                            <div className="mt-4 text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                              <p>Add people using "Show User Selection" above to split costs.</p>
                            </div>
                          )}
                          
                          {/* Split Mode Cost Summary */}
                          {sourceUserBreakdown && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
                              <h4 className="font-semibold text-sm">Cost Breakdown:</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>You:</span>
                                  <span className="font-medium">{BillingCalculator.formatCurrency(sourceUserBreakdown.costBreakdown.total)}</span>
                                </div>
                                {splitUsers.map(user => (
                                  <div key={user.userId} className="flex justify-between text-sm">
                                    <span>{user.displayName}:</span>
                                    <span className="font-medium">{BillingCalculator.formatCurrency(user.costBreakdown.total)}</span>
                                  </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between text-sm font-bold">
                                  <span>Grand Total:</span>
                                  <span>{BillingCalculator.formatCurrency(sourceUserBreakdown.costBreakdown.total + splitUsers.reduce((sum, u) => sum + u.costBreakdown.total, 0))}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Save/Cancel buttons */}
                      {hasOccupancyChanges && !paymentCreated && (
                        <div className="flex gap-2 pt-4 mt-4 border-t">
                          <Button
                            onClick={handleSaveOccupancy}
                            disabled={syncingOccupancy}
                            className="flex-1"
                          >
                            {syncingOccupancy ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            onClick={handleCancelOccupancyEdit}
                            variant="outline"
                            disabled={syncingOccupancy}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Split Mode Cost Breakdowns - Individual cards for each person */}
              {splitMode && sourceUserBreakdown && (() => {
                // Calculate total guest-nights for proportional share calculation
                const sourceTotalGuestNights = Object.values(sourceDailyGuests).reduce((sum, guests) => sum + guests, 0);
                const allGuestNights = sourceTotalGuestNights + splitUsers.reduce((sum, user) => 
                  sum + Object.values(user.dailyGuests).reduce((s, g) => s + g, 0), 0
                );

                // Use the calculated source user's cost breakdown
                const sourceBreakdown = sourceUserBreakdown.costBreakdown;
                const sourcePercentage = allGuestNights > 0 ? sourceTotalGuestNights / allGuestNights : 0;
                const sourceReceiptsShare = checkoutData.receiptsTotal * sourcePercentage;
                const sourceCreditShare = previousCredit * sourcePercentage;
                const sourceBalanceShare = previousBalance * sourcePercentage;
                const sourceTotal = sourceBreakdown.total - sourceReceiptsShare - sourceCreditShare + sourceBalanceShare;

                return (
                  <>
                    {/* Source User (You) Cost Breakdown */}
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Your Cost Breakdown
                        </CardTitle>
                        <CardDescription>
                          Based on {sourceTotalGuestNights} guest-night{sourceTotalGuestNights !== 1 ? 's' : ''} ({Math.round(sourcePercentage * 100)}% of total)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base rate:</span>
                            <span className="font-medium">{BillingCalculator.formatCurrency(sourceBreakdown.baseAmount)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {sourceBreakdown.details}
                          </div>
                          
                          {sourceBreakdown.cleaningFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cleaning fee (proportional):</span>
                              <span className="font-medium">{BillingCalculator.formatCurrency(sourceBreakdown.cleaningFee)}</span>
                            </div>
                          )}
                          
                          {sourceBreakdown.petFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pet fee:</span>
                              <span className="font-medium">{BillingCalculator.formatCurrency(sourceBreakdown.petFee)}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-medium">{BillingCalculator.formatCurrency(sourceBreakdown.subtotal)}</span>
                          </div>
                          
                          {sourceBreakdown.tax > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tax:</span>
                              <span className="font-medium">{BillingCalculator.formatCurrency(sourceBreakdown.tax)}</span>
                            </div>
                          )}
                          
                          {sourceBreakdown.damageDeposit > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Damage deposit (proportional):</span>
                              <span className="font-medium">{BillingCalculator.formatCurrency(sourceBreakdown.damageDeposit)}</span>
                            </div>
                          )}
                          
                          {sourceReceiptsShare > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Less: Your share of receipts:</span>
                              <span className="font-medium text-green-600">-{BillingCalculator.formatCurrency(sourceReceiptsShare)}</span>
                            </div>
                          )}
                          
                          {sourceCreditShare > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Your share of credit:</span>
                              <span className="font-medium text-green-600">-{BillingCalculator.formatCurrency(sourceCreditShare)}</span>
                            </div>
                          )}
                          
                          {sourceBalanceShare !== 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Your share of previous balance:</span>
                              <span className={`font-medium ${sourceBalanceShare > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {sourceBalanceShare > 0 ? '' : '-'}{BillingCalculator.formatCurrency(Math.abs(sourceBalanceShare))}
                              </span>
                            </div>
                          )}
                          
                          <Separator />
                          
                          <div className="flex justify-between text-lg font-semibold">
                            <span>Your Total Amount Due:</span>
                            <span className={sourceTotal < 0 ? 'text-green-600' : 'text-primary'}>
                              {BillingCalculator.formatCurrency(sourceTotal)}
                            </span>
                          </div>

                          {/* Venmo Payment for Source User */}
                          {checkoutData.venmoHandle && (
                            <>
                              <Separator className="my-4" />
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-5 w-5 text-blue-600" />
                                  <h4 className="text-base font-medium">Your Payment Options</h4>
                                </div>
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    const cleanHandle = checkoutData.venmoHandle.replace('@', '');
                                    const venmoUrl = `https://venmo.com/${cleanHandle}?txn=pay&amount=${Math.abs(sourceTotal)}&note=${encodeURIComponent('Cabin stay - My share')}`;
                                    window.open(venmoUrl, '_blank');
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Pay Your Share via Venmo ({BillingCalculator.formatCurrency(Math.abs(sourceTotal))})
                                </Button>
                              </div>
                            </>
                          )}

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={async () => {
                              await createDeferredPaymentForUser(
                                user?.id || '',
                                claimedProfile?.family_group_name || currentReservation?.family_group || '',
                                claimedProfile?.member_name || 'You',
                                sourceTotal,
                                sourceDailyGuests
                              );
                            }}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            I'll Pay by End of Season
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Each Split User's Cost Breakdown */}
                    {splitUsers.map(user => {
                      const userGuestNights = Object.values(user.dailyGuests).reduce((sum, guests) => sum + guests, 0);
                      const userPercentage = allGuestNights > 0 ? userGuestNights / allGuestNights : 0;
                      const userReceiptsShare = checkoutData.receiptsTotal * userPercentage;
                      const userCreditShare = previousCredit * userPercentage;
                      const userBalanceShare = previousBalance * userPercentage;
                      const userTotal = user.costBreakdown.total - userReceiptsShare - userCreditShare + userBalanceShare;

                      return (
                        <Card key={user.userId} className="mb-6">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <DollarSign className="h-5 w-5" />
                              {user.displayName}'s Cost Breakdown
                            </CardTitle>
                            <CardDescription>
                              Based on {userGuestNights} guest-night{userGuestNights !== 1 ? 's' : ''} ({Math.round(userPercentage * 100)}% of total)
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Base rate:</span>
                                <span className="font-medium">{BillingCalculator.formatCurrency(user.costBreakdown.baseAmount)}</span>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {user.costBreakdown.details}
                              </div>
                              
                              {user.costBreakdown.cleaningFee > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Cleaning fee (proportional):</span>
                                  <span className="font-medium">{BillingCalculator.formatCurrency(user.costBreakdown.cleaningFee)}</span>
                                </div>
                              )}
                              
                              {user.costBreakdown.petFee > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Pet fee:</span>
                                  <span className="font-medium">{BillingCalculator.formatCurrency(user.costBreakdown.petFee)}</span>
                                </div>
                              )}
                              
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span className="font-medium">{BillingCalculator.formatCurrency(user.costBreakdown.subtotal)}</span>
                              </div>
                              
                              {user.costBreakdown.tax > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tax:</span>
                                  <span className="font-medium">{BillingCalculator.formatCurrency(user.costBreakdown.tax)}</span>
                                </div>
                              )}
                              
                              {user.costBreakdown.damageDeposit > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Damage deposit (proportional):</span>
                                  <span className="font-medium">{BillingCalculator.formatCurrency(user.costBreakdown.damageDeposit)}</span>
                                </div>
                              )}
                              
                              {userReceiptsShare > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Less: Their share of receipts:</span>
                                  <span className="font-medium text-green-600">-{BillingCalculator.formatCurrency(userReceiptsShare)}</span>
                                </div>
                              )}
                              
                              {userCreditShare > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Their share of credit:</span>
                                  <span className="font-medium text-green-600">-{BillingCalculator.formatCurrency(userCreditShare)}</span>
                                </div>
                              )}
                              
                              {userBalanceShare !== 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Their share of previous balance:</span>
                                  <span className={`font-medium ${userBalanceShare > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                    {userBalanceShare > 0 ? '' : '-'}{BillingCalculator.formatCurrency(Math.abs(userBalanceShare))}
                                  </span>
                                </div>
                              )}
                              
                              <Separator />
                              
                              <div className="flex justify-between text-lg font-semibold">
                                <span>Their Total Amount Due:</span>
                                <span className={userTotal < 0 ? 'text-green-600' : 'text-primary'}>
                                  {BillingCalculator.formatCurrency(userTotal)}
                                </span>
                              </div>

                              {/* Payment Options for Split User */}
                              {checkoutData.venmoHandle && (
                                <>
                                  <Separator className="my-4" />
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="h-5 w-5 text-blue-600" />
                                      <h4 className="text-base font-medium">Payment Options for {user.displayName}</h4>
                                    </div>
                                    <Button
                                      className="w-full"
                                      onClick={() => {
                                        const cleanHandle = checkoutData.venmoHandle.replace('@', '');
                                        const venmoUrl = `https://venmo.com/${cleanHandle}?txn=pay&amount=${Math.abs(userTotal)}&note=${encodeURIComponent(`Cabin stay - ${user.displayName}'s share`)}`;
                                        window.open(venmoUrl, '_blank');
                                      }}
                                    >
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      Pay via Venmo ({BillingCalculator.formatCurrency(Math.abs(userTotal))})
                                    </Button>
                                  </div>
                                </>
                              )}

                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                  await createDeferredPaymentForUser(
                                    user.userId,
                                    user.familyGroup,
                                    user.displayName,
                                    userTotal,
                                    user.dailyGuests
                                  );
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                They'll Pay by End of Season
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                );
              })()}

              {/* Cost Breakdown - Single view (split details shown in Daily Occupancy card above) */}
              {!splitMode && (
                // Original single cost breakdown
                <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base rate:</span>
                      <span className="font-medium">{BillingCalculator.formatCurrency(enhancedBilling.baseAmount)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {enhancedBilling.details}
                    </div>
                    
                    {enhancedBilling.cleaningFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cleaning fee:</span>
                        <span className="font-medium">{BillingCalculator.formatCurrency(enhancedBilling.cleaningFee)}</span>
                      </div>
                    )}
                    
                    {enhancedBilling.petFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pet fee:</span>
                        <span className="font-medium">{BillingCalculator.formatCurrency(enhancedBilling.petFee)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{BillingCalculator.formatCurrency(enhancedBilling.subtotal)}</span>
                    </div>
                    
                    {enhancedBilling.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax:</span>
                        <span className="font-medium">{BillingCalculator.formatCurrency(enhancedBilling.tax)}</span>
                      </div>
                    )}
                    
                    {enhancedBilling.damageDeposit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Damage deposit:</span>
                        <span className="font-medium">{BillingCalculator.formatCurrency(enhancedBilling.damageDeposit)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Less: Receipts submitted:</span>
                      <span className="font-medium text-green-600">-{BillingCalculator.formatCurrency(checkoutData.receiptsTotal)}</span>
                    </div>
                    
                    {previousCredit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Previous Credit Applied:</span>
                        <span className="font-medium text-green-600">
                          -{BillingCalculator.formatCurrency(previousCredit)}
                        </span>
                      </div>
                    )}
                    
                    {previousBalance !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Previous Balance:</span>
                        <span className={`font-medium ${previousBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {previousBalance > 0 ? '' : '-'}{BillingCalculator.formatCurrency(Math.abs(previousBalance))}
                        </span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Amount Due:</span>
                      <span className={totalAmount < 0 ? 'text-green-600' : 'text-primary'}>
                        {BillingCalculator.formatCurrency(totalAmount)}
                      </span>
                    </div>
                    
                    {/* Venmo Payment Info */}
                    {checkoutData.venmoHandle && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-3 pointer-events-auto">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <h4 className="text-base font-medium">Pay via Venmo</h4>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                            {totalAmount < 0 ? (
                              // Negative balance - show credit options
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  You have a credit of {BillingCalculator.formatCurrency(Math.abs(totalAmount))}. Choose an option:
                                </p>
                                
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={handleApplyCreditToFuture}
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Apply Credit to Future Reservations
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={() => {
                                    const cleanHandle = checkoutData.venmoHandle.replace('@', '');
                                    const absAmount = Math.abs(totalAmount);
                                    const venmoUrl = `https://venmo.com/${cleanHandle}?txn=charge&amount=${absAmount}&note=${encodeURIComponent('Cabin stay refund request')}`;
                                    console.log('Opening Venmo URL:', venmoUrl);
                                    window.open(venmoUrl, '_blank');
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Request Refund via Venmo
                                </Button>
                              </div>
                            ) : (
                              // Positive balance - show pay now button
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-base font-medium">{checkoutData.venmoHandle}</p>
                                  <p className="text-sm text-muted-foreground">Amount: {BillingCalculator.formatCurrency(totalAmount)}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const cleanHandle = checkoutData.venmoHandle.replace('@', '');
                                    const venmoUrl = `https://venmo.com/${cleanHandle}?txn=pay&amount=${totalAmount}&note=${encodeURIComponent('Cabin stay payment')}`;
                                    console.log('Opening Venmo URL:', venmoUrl);
                                    window.open(venmoUrl, '_blank');
                                  }}
                                  disabled={totalAmount === 0}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Pay Now
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Defer Payment Button */}
                    <Separator className="my-4" />
                    <Button
                      variant="outline"
                      onClick={handlePayLater}
                      disabled={isCreatingPayment}
                      className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/20"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {isCreatingPayment ? "Processing..." : "Will pay by end of season"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Confirmation */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <h3 className="text-lg font-semibold">Thank You for Your Stay!</h3>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Button variant="outline" onClick={() => navigate("/home")} className="text-base">
                        Return to Home
                      </Button>
                      <Button variant="outline" onClick={() => navigate("/stay-history")} className="text-base">
                        <History className="h-4 w-4 mr-2" />
                        View Stay History
                      </Button>
                      <Button onClick={() => window.print()} className="text-base">
                        Print Summary
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Early Checkout Dialog */}
        <EarlyCheckoutDialog
          open={earlyCheckoutOpen}
          onOpenChange={setEarlyCheckoutOpen}
          reservation={currentReservation || sampleReservation}
          onComplete={currentReservation ? handleEarlyCheckoutComplete : () => setEarlyCheckoutOpen(false)}
          isPreviewMode={!currentReservation}
        />

        {/* Guest Cost Split Dialog */}
        {currentReservation && organization && user && (
          <GuestCostSplitDialog
            open={splitCostsOpen}
            onOpenChange={setSplitCostsOpen}
            organizationId={organization.id}
            reservationId={currentReservation.id}
            dailyBreakdown={dailyBreakdown}
            totalAmount={enhancedBilling.total}
            sourceUserId={user.id}
            sourceFamilyGroup={currentReservation.family_group}
            onSplitCreated={async (splitData) => {
              // Enable split mode
              setSplitMode(true);
              
              // Calculate cost breakdowns for each user
              const calculatedSplits = calculateSplitCostBreakdowns(splitData);
              setSplitUsers(calculatedSplits);
              
              // Close dialog
              setSplitCostsOpen(false);
              
              toast({
                title: "Split Configured",
                description: "Cost breakdown updated to show individual charges. Review amounts below.",
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CheckoutFinal;