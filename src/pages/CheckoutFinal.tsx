import { useState, useEffect } from "react";
import { ArrowLeft, DollarSign, Users, Calendar, CreditCard, Send, FileText, CheckCircle, TrendingUp, History, Clock, CalendarDays } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { parseDateOnly } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";
import { GuestCostSplitDialog } from "@/components/GuestCostSplitDialog";
import { useOrganization } from "@/hooks/useOrganization";

const CheckoutFinal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const { organization } = useOrganization();

  // Get the most recent reservation for the current user's stay
  // Prioritize original reservations, then transferred-in reservations
  const getCurrentUserReservation = () => {
    const userReservations = reservations.filter(r => {
      // Only show confirmed reservations
      if (r.status !== 'confirmed') return false;
      
      // If it's a transferred-out reservation, don't show it for checkout (original person already checked out)
      if (r.transfer_type === 'transferred_out') return false;
      
      return true;
    });
    
    // Sort by start date descending to get most recent
    return userReservations.sort((a, b) => parseDateOnly(b.start_date).getTime() - parseDateOnly(a.start_date).getTime())[0];
  };

  const currentReservation = getCurrentUserReservation();

  // Load checkout completion status from database and localStorage
  useEffect(() => {
    const loadCheckoutStatus = async () => {
      // First check localStorage for quick access
      const familyData = localStorage.getItem('familySetupData');
      if (familyData) {
        const { organizationCode } = JSON.parse(familyData);
        const savedCompletion = localStorage.getItem(`checkout_completion_${organizationCode}`);
        if (savedCompletion) {
          const localStatus = JSON.parse(savedCompletion);
          setChecklistStatus(localStatus);
          console.log('✅ [CHECKOUT-STATUS] Loaded from localStorage:', localStatus);
        }
      }

      // Then check database for the most recent checkout session
      if (currentReservation) {
        try {
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

          if (!error && checkoutSession?.checklist_responses) {
            const responses = checkoutSession.checklist_responses as any;
            const checklistCompletion = responses?.checklistCompletion;
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
              }
            }
          }
        } catch (error) {
          console.error('❌ [CHECKOUT-STATUS] Failed to load from database:', error);
        }
      }
    };

    loadCheckoutStatus();
  }, [currentReservation?.id, currentReservation?.family_group, currentReservation?.start_date, currentReservation?.end_date]);

  // Calculate stay dates from the current reservation
  const checkInDate = currentReservation ? parseDateOnly(currentReservation.start_date) : null;
  const checkOutDate = currentReservation ? parseDateOnly(currentReservation.end_date) : null;
  
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

  // Calculate receipts total for the stay period
  const calculateReceiptsTotal = () => {
    if (!checkInDate || !checkOutDate) return 0;
    
    return receipts
      .filter(receipt => {
        const receiptDate = new Date(receipt.date);
        return receiptDate >= checkInDate && receiptDate <= checkOutDate;
      })
      .reduce((total, receipt) => total + receipt.amount, 0);
  };

  const receiptsTotal = calculateReceiptsTotal();

  // Calculate number of nights (only nights spent, not checkout day)
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  };

  // Build checkout data from actual reservation data
  const checkoutData = {
    guests: currentReservation?.guest_count || 0,
    nights: calculateNights(),
    receiptsTotal,
    checkInDate: checkInDate?.toISOString().split('T')[0] || '',
    checkOutDate: checkOutDate?.toISOString().split('T')[0] || '',
    venmoHandle: financialSettings?.venmo_handle || '',
    paypalEmail: financialSettings?.paypal_email || '',
    checkAddress: {
      name: financialSettings?.check_payable_to || '',
      address: financialSettings?.check_mailing_address || ''
    }
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
      checkInDate: new Date(checkoutData.checkInDate),
      checkOutDate: new Date(checkoutData.checkOutDate),
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
    averageGuests,
    loading: billingLoading,
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
  const totalAmount = Math.max(0, enhancedBilling.total - checkoutData.receiptsTotal);

  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const handlePayLater = async () => {
    setIsCreatingPayment(true);
    const success = await createDeferredPayment();
    setIsCreatingPayment(false);
    
    if (success) {
      toast({
        title: "Payment Deferred",
        description: "This payment has been added to your season balance. View Season Summary to see your total.",
      });
      
      // Navigate to season summary after successful deferral
      setTimeout(() => navigate("/season-summary"), 1500);
    }
  };

  // Show loading state if any data is still loading
  const isLoading = sessionsLoading || surveyLoading || financialLoading || receiptsLoading || reservationsLoading || billingLoading;

  // Check if we have the necessary data to show checkout
  const hasStayData = currentReservation && checkoutData.checkInDate && checkoutData.checkOutDate;

  // Check if early checkout is possible (reservation extends beyond today)
  const canEarlyCheckout = currentReservation && 
    new Date(currentReservation.end_date) > new Date();

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
          <h1 className="text-6xl font-kaushan text-primary drop-shadow-lg">Final Checkout</h1>
          
          {/* Right side spacer for balance */}
          <div className="w-20"></div>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-6 -mt-2">
          <p className="text-xl font-kaushan text-primary">Review your stay and complete payment</p>
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
            {/* Preview Mode Banner - shown when checklist is incomplete */}
            {!checklistStatus?.isComplete && (
              <div className="mb-6">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                      Preview Mode - Checkout List Required
                    </h3>
                  </div>
                  <p className="text-amber-700 dark:text-amber-300 mb-3">
                    This is a preview of your final checkout. Complete the checkout checklist to unlock payment options.
                  </p>
                  {checklistStatus && (
                    <p className="text-amber-600 dark:text-amber-400 mb-3 text-sm">
                      Progress: {checklistStatus.completedTasks} of {checklistStatus.totalTasks} tasks completed
                    </p>
                  )}
                  <Button 
                    onClick={() => navigate("/checkout-list")} 
                    className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                  >
                    Complete Checkout List
                  </Button>
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
                    ({new Date(currentReservation.start_date).toLocaleDateString()} - {new Date(currentReservation.end_date).toLocaleDateString()}).
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
                        Your reservation continues until {new Date(currentReservation.end_date).toLocaleDateString()}
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

            {/* Wrapper div with conditional opacity for preview mode */}
            <div className={`space-y-6 ${!checklistStatus?.isComplete ? 'opacity-60 pointer-events-none select-none' : ''}`}>
              {/* Stay Summary */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Stay Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-in:</span>
                      <span className="font-medium">{new Date(checkoutData.checkInDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out:</span>
                      <span className="font-medium">{new Date(checkoutData.checkOutDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number of nights:</span>
                      <span className="font-medium">{checkoutData.nights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reserved guests:</span>
                      <span className="font-medium">{checkoutData.guests}</span>
                    </div>
                    {totalDays > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual average guests:</span>
                        <span className="font-medium">{averageGuests.toFixed(1)} per day</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Occupancy Breakdown */}
              {dailyBreakdown.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Daily Occupancy & Charges
                    </CardTitle>
                    <CardDescription>
                      Billing calculated from actual daily guest counts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                        <span>Date</span>
                        <span className="text-center">Guests</span>
                        <span className="text-right">Cost</span>
                      </div>
                      {dailyBreakdown.map((day, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
                          <span>{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="text-center font-medium">{day.guests}</span>
                          <span className="text-right font-medium">{BillingCalculator.formatCurrency(day.cost)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t mt-2">
                        <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
                          <span>Total ({totalDays} days)</span>
                          <span className="text-center">{averageGuests.toFixed(1)} avg</span>
                          <span className="text-right">{BillingCalculator.formatCurrency(enhancedBilling.baseAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stay Report */}
              {(!sessionsLoading && !surveyLoading && (arrivalSessions.length > 0 || dailySessions.length > 0 || surveyResponses.length > 0)) && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Comprehensive Stay Report
                    </CardTitle>
                    <CardDescription className="text-base">
                      Complete record of your stay activities and observations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Arrival Check-in */}
                    {arrivalSessions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-base text-muted-foreground mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Arrival Check-In
                        </h4>
                        {arrivalSessions.map((session, index) => (
                          <div key={session.id} className="bg-muted rounded p-3 mb-2">
                            <div className="text-base text-muted-foreground mb-2">
                              {new Date(session.check_date).toLocaleDateString()}
                            </div>
                            {session.notes && (
                              <p className="text-base whitespace-pre-wrap">{session.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Daily Check-ins */}
                    {dailySessions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-base text-muted-foreground mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Daily Check-Ins ({dailySessions.length} sessions)
                        </h4>
                        <div className="space-y-3">
                          {dailySessions.map((session) => {
                            const responses = session.checklist_responses as any;
                            const completedTasks = responses?.completedTasks || 0;
                            const totalOccupancy = responses?.dailyOccupancy ? 
                              Object.values(responses.dailyOccupancy).reduce((sum: number, val: any) => sum + (parseInt(val) || 0), 0) : 0;
                            
                            return (
                              <div key={session.id} className="bg-muted rounded p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="text-base font-medium">
                                    {new Date(session.check_date).toLocaleDateString()}
                                  </div>
                                  <div className="text-base text-muted-foreground">
                                    {completedTasks} tasks completed
                                  </div>
                                </div>
                                
                                 {(totalOccupancy as number) > 0 && (
                                  <div className="text-base text-muted-foreground mb-2">
                                    Daily occupancy: {totalOccupancy as number} guests
                                  </div>
                                )}
                                
                                {responses?.readings && Object.values(responses.readings).some((v: any) => v) && (
                                  <div className="text-base text-muted-foreground mb-2">
                                    Readings recorded: {Object.entries(responses.readings)
                                      .filter(([_, v]) => v)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(", ")}
                                  </div>
                                )}
                                
                                {session.notes && (
                                  <p className="text-base whitespace-pre-wrap mt-2">{session.notes}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Survey Responses */}
                    {surveyResponses.length > 0 && (
                      <div>
                        <h4 className="font-medium text-base text-muted-foreground mb-3">Survey Responses:</h4>
                        {surveyResponses.map((response, index) => (
                          <div key={response.id} className="bg-muted rounded p-3 mb-2">
                            <div className="text-base text-muted-foreground mb-2">
                              {new Date().toLocaleDateString()}
                            </div>
                            <p className="text-base">Survey data recorded</p>
                          </div>
                        ))}
                      </div>
                    )}
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
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Amount Due:</span>
                      <span className="text-primary">{BillingCalculator.formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Options */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Payment Options</CardTitle>
                  <CardDescription>
                    Choose to pay now or defer payment to end of season
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pay Later Option */}
                  <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium flex items-center gap-2 mb-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            Pay at End of Season
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Defer this payment until the end of the season (Oct 31). 
                            You can pay your full season balance at once.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={handlePayLater}
                              disabled={isCreatingPayment}
                              className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/20"
                            >
                              {isCreatingPayment ? "Processing..." : "Defer Payment"}
                            </Button>
                            {totalDays > 0 && dailyBreakdown.length > 0 && (
                              <Button
                                variant="outline"
                                onClick={() => setSplitCostsOpen(true)}
                                className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/20"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Split Guest Costs
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Venmo Option */}
                  {checkoutData.venmoHandle && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <h4 className="text-lg font-medium">Venmo</h4>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-medium">Pay {checkoutData.venmoHandle}</p>
                            <p className="text-base text-muted-foreground">Amount: {BillingCalculator.formatCurrency(totalAmount)}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const venmoUrl = `https://venmo.com/${checkoutData.venmoHandle}?txn=pay&amount=${totalAmount}&note=Cabin stay payment`;
                              window.open(venmoUrl, '_blank');
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Check Option */}
                  {checkoutData.checkAddress.name && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <h4 className="text-lg font-medium">Check Payment</h4>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-base font-medium">Make check payable to:</p>
                            <p className="text-base">{checkoutData.checkAddress.name}</p>
                          </div>
                          {checkoutData.checkAddress.address && (
                            <div>
                              <p className="text-base font-medium">Mail to:</p>
                              <p className="text-base whitespace-pre-line">{checkoutData.checkAddress.address}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-base font-medium">Amount: {BillingCalculator.formatCurrency(totalAmount)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Confirmation */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <h3 className="text-lg font-semibold">Thank You for Your Stay!</h3>
                    <p className="text-base text-muted-foreground">
                      Please complete payment within 7 days. You will receive a confirmation email once payment is processed.
                    </p>
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
        {currentReservation && organization && (
          <GuestCostSplitDialog
            open={splitCostsOpen}
            onOpenChange={setSplitCostsOpen}
            organizationId={organization.id}
            dailyBreakdown={dailyBreakdown}
            totalAmount={enhancedBilling.total}
            sourceUserId={currentReservation.user_id || ''}
            sourceFamilyGroup={currentReservation.family_group}
            onSplitCreated={() => {
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