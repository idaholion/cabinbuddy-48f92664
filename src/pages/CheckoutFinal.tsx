import { useState, useEffect } from "react";
import { ArrowLeft, DollarSign, Users, Calendar, CreditCard, Send, FileText, CheckCircle, Circle, TrendingUp, History, Clock, CalendarDays, Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";

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
  
  const { organization } = useOrganization();
  const { updateOccupancy, syncing: syncingOccupancy } = useDailyOccupancySync(organization?.id || '');
  
  // Check if there are unsaved occupancy changes
  const hasOccupancyChanges = Object.keys(editedOccupancy).length > 0;
  
  const { isAdmin } = useOrgAdmin();

  // Get the most recent reservation for the current user's stay
  // Prioritize original reservations, then transferred-in reservations
  const getCurrentUserReservation = () => {
    if (!user) return undefined;
    
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
        // For host assignments, check if user's claimed name matches the primary host
        if (r.host_assignments && Array.isArray(r.host_assignments) && r.host_assignments.length > 0) {
          const primaryHost = r.host_assignments[0];
          return primaryHost.host_name === claimedProfile.member_name;
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
    
    // Sort by start date descending to get most recent
    return userReservations.sort((a, b) => parseDateOnly(b.start_date).getTime() - parseDateOnly(a.start_date).getTime())[0];
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
  const sampleData = !currentReservation ? generateSampleData() : null;
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
    isSample: sampleData?.isSample || false
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
            onClick={() => navigate("/checkout-list")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
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
            
            {/* Checkout Checklist Status - informational only, not a blocker */}
            {!checkoutData.isSample && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {checklistStatus?.isComplete ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Checkout Checklist Completed
                      </>
                    ) : (
                      <>
                        <Circle className="h-5 w-5 text-muted-foreground" />
                        Checkout Checklist
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {checklistStatus?.isComplete 
                      ? `Completed ${checklistStatus.completedAt ? new Date(checklistStatus.completedAt).toLocaleString() : 'recently'}`
                      : "Don't forget to finish the checkout checklist before you go"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {checklistStatus?.isComplete ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        All {checklistStatus.totalTasks} checklist tasks have been completed. Thank you!
                      </p>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/checkout-list")}
                      >
                        View Checklist
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {checklistStatus 
                            ? `${checklistStatus.completedTasks} of ${checklistStatus.totalTasks} tasks completed`
                            : 'Not yet started'
                          }
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/checkout-list")}
                      >
                        Go to Checklist
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
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

            {/* Early Checkout Option - Available even when checklist is incomplete */}
            {canEarlyCheckout && (
              <Card className="mb-6 border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <Clock className="h-5 w-5" />
                    Early Checkout Available
                  </CardTitle>
                  <CardDescription>
                    Leaving early? Manage your remaining reservation time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Your reservation continues until {checkOutDate?.toLocaleDateString()}
                      </p>
                      <p className="text-sm font-medium">
                        Cancel remaining days, transfer to family, or offer to others
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setEarlyCheckoutOpen(true)}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/20"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Early Checkout
                    </Button>
                  </div>
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
                      {billingLocked 
                        ? "Billing is locked - guest counts can be updated but charges are frozen"
                        : "Edit guest counts to recalculate charges"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
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
                      
                      {/* Split Guest Costs Button */}
                      {totalDays > 0 && dailyBreakdown.length > 0 && !hasOccupancyChanges && currentReservation && isUserReservationOwner(currentReservation) && (
                        <div className="pt-4 mt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setSplitCostsOpen(true)}
                            className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/20"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Split Guest Costs
                          </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

              {/* Cost Breakdown */}
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
        {currentReservation && (
          <EarlyCheckoutDialog
            open={earlyCheckoutOpen}
            onOpenChange={setEarlyCheckoutOpen}
            reservation={currentReservation}
            onComplete={handleEarlyCheckoutComplete}
          />
        )}

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
            onSplitCreated={async () => {
              // Refresh billing data to show updated amounts
              await refetch();
              toast({
                title: "Costs Split Successfully",
                description: "Guest will be notified via email and charges have been updated.",
              });
              setSplitCostsOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CheckoutFinal;