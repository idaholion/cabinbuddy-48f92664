import { useState, useEffect } from "react";
import { ArrowLeft, DollarSign, Users, Calendar, CreditCard, Send, FileText, CheckCircle, TrendingUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useCheckinSessions, useSurveyResponses } from "@/hooks/useChecklistData";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useReceipts } from "@/hooks/useReceipts";
import { useReservations } from "@/hooks/useReservations";
import { BillingCalculator } from "@/lib/billing-calculator";

const CheckoutFinal = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      const savedCompletion = localStorage.getItem(`checkout_completion_${organizationCode}`);
      if (savedCompletion) {
        setChecklistStatus(JSON.parse(savedCompletion));
      }
    }
  }, []);

  // Get the most recent reservation for checkout data
  const currentReservation = reservations
    .filter(r => r.status === 'confirmed')
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];

  // Calculate stay dates from the current reservation
  const checkInDate = currentReservation ? new Date(currentReservation.start_date) : null;
  const checkOutDate = currentReservation ? new Date(currentReservation.end_date) : null;
  
  // Filter sessions for the current stay period
  const arrivalSessions = sessions.filter(s => s.session_type === 'arrival');
  const dailySessions = sessions
    .filter(s => s.session_type === 'daily')
    .filter(s => {
      if (!checkInDate || !checkOutDate) return false;
      const sessionDate = new Date(s.check_date);
      return sessionDate >= checkInDate && sessionDate <= checkOutDate;
    })
    .sort((a, b) => new Date(a.check_date).getTime() - new Date(b.check_date).getTime());

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

  // Calculate number of nights
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
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

  const billing = calculateBilling();
  const totalAmount = Math.max(0, billing.total - checkoutData.receiptsTotal);

  // Show loading state if any data is still loading
  const isLoading = sessionsLoading || surveyLoading || financialLoading || receiptsLoading || reservationsLoading;

  // Check if we have the necessary data to show checkout
  const hasStayData = currentReservation && checkoutData.checkInDate && checkoutData.checkOutDate;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/checkout-list")}
              className="shrink-0 text-base"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Final Checkout</h1>
              <p className="text-base text-muted-foreground">
                Review your stay and complete payment
              </p>
            </div>
          </div>
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
        ) : !checklistStatus?.isComplete ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-destructive">Checkout List Not Complete</h3>
                <p className="text-base text-muted-foreground">
                  Please complete the checkout checklist before proceeding with final checkout.
                </p>
                {checklistStatus && (
                  <p className="text-base text-muted-foreground">
                    Progress: {checklistStatus.completedTasks}/{checklistStatus.totalTasks} tasks completed
                  </p>
                )}
                <Button onClick={() => navigate("/checkout-list")} className="text-base">
                  Complete Checkout List
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
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
                <span className="text-muted-foreground">Number of guests:</span>
                <span className="font-medium">{checkoutData.guests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <span className="font-medium">{BillingCalculator.formatCurrency(billing.baseAmount)}</span>
              </div>
              <div className="text-base text-muted-foreground mb-2">
                {billing.details}
              </div>
              
              {billing.cleaningFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cleaning fee:</span>
                  <span className="font-medium">{BillingCalculator.formatCurrency(billing.cleaningFee)}</span>
                </div>
              )}
              
              {billing.petFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pet fee:</span>
                  <span className="font-medium">{BillingCalculator.formatCurrency(billing.petFee)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{BillingCalculator.formatCurrency(billing.subtotal)}</span>
              </div>
              
              {billing.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">{BillingCalculator.formatCurrency(billing.tax)}</span>
                </div>
              )}
              
              {billing.damageDeposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Damage deposit:</span>
                  <span className="font-medium">{BillingCalculator.formatCurrency(billing.damageDeposit)}</span>
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
            <CardDescription className="text-base">
              Choose your preferred payment method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Venmo Payment */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Venmo Payment</h3>
                  <p className="text-base text-muted-foreground">Send payment directly via Venmo</p>
                </div>
              </div>
              <div className="bg-muted rounded p-3 mb-3">
                <p className="text-base font-medium">Venmo Handle:</p>
                <p className="text-lg font-mono">{checkoutData.venmoHandle}</p>
                <p className="text-base text-muted-foreground mt-1">
                  Amount: ${totalAmount}
                </p>
              </div>
              <Button 
                className="w-full text-base"
                onClick={() => {
                  const venmoUrl = `https://venmo.com/${checkoutData.venmoHandle.replace('@', '')}?txn=pay&amount=${totalAmount}&note=Cabin Stay ${checkoutData.checkInDate} to ${checkoutData.checkOutDate}`;
                  window.open(venmoUrl, '_blank');
                }}
              >
                Pay with Venmo
              </Button>
            </div>

            {/* Check Payment */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Check Payment</h3>
                  <p className="text-base text-muted-foreground">Mail a check to the address below</p>
                </div>
              </div>
              <div className="bg-muted rounded p-3">
                <p className="text-base font-medium mb-2">Mail check to:</p>
                <div className="text-base space-y-1">
                  <p className="font-medium">{checkoutData.checkAddress.name}</p>
                  <div className="whitespace-pre-line">
                    {checkoutData.checkAddress.address}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t">
                  <p className="text-base">
                    <span className="font-medium">Amount:</span> {BillingCalculator.formatCurrency(totalAmount)}
                  </p>
                  <p className="text-base">
                    <span className="font-medium">Memo:</span> Cabin Stay {checkoutData.checkInDate} to {checkoutData.checkOutDate}
                  </p>
                </div>
              </div>
            </div>
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
            </>
        )}
      </div>
    </div>
  );
};

export default CheckoutFinal;