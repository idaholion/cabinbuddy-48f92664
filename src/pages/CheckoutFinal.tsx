import { useState, useEffect } from "react";
import { ArrowLeft, DollarSign, Users, Calendar, CreditCard, Send, FileText, CheckCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useCheckinSessions, useSurveyResponses } from "@/hooks/useChecklistData";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { BillingCalculator } from "@/lib/billing-calculator";

const CheckoutFinal = () => {
  const navigate = useNavigate();
  const { sessions, loading: sessionsLoading } = useCheckinSessions();
  const { responses: surveyResponses, loading: surveyLoading } = useSurveyResponses();
  const { settings: financialSettings, loading: financialLoading } = useFinancialSettings();

  // Filter sessions for the current stay period
  const checkInDate = new Date("2024-07-20"); // In real app, this would come from context/props
  const checkOutDate = new Date("2024-07-23");
  
  const arrivalSessions = sessions.filter(s => s.session_type === 'arrival');
  const dailySessions = sessions
    .filter(s => s.session_type === 'daily')
    .filter(s => {
      const sessionDate = new Date(s.check_date);
      return sessionDate >= checkInDate && sessionDate <= checkOutDate;
    })
    .sort((a, b) => new Date(a.check_date).getTime() - new Date(b.check_date).getTime());

  // Mock data - in a real app, this would come from your state management or API
  const checkoutData = {
    guests: 6,
    nights: 3,
    costPerPersonPerDay: 45,
    totalCost: 810,
    receiptsTotal: 127.50, // Total amount of receipts to subtract
    financialMethod: "per-person-per-day", // or "total-split"
    checkInDate: "2024-07-20",
    checkOutDate: "2024-07-23",
    venmoHandle: "@CabinBuddy-Payments",
    checkAddress: {
      name: "Cabin Management LLC",
      street: "123 Mountain View Drive",
      city: "Yellowstone",
      state: "MT",
      zip: "59718"
    }
  };

  const calculateBilling = () => {
    if (!financialSettings) {
      // Fallback to old calculation method
      if (checkoutData.financialMethod === "per-person-per-day") {
        return {
          baseAmount: checkoutData.guests * checkoutData.nights * checkoutData.costPerPersonPerDay,
          cleaningFee: 0,
          petFee: 0,
          damageDeposit: 0,
          subtotal: checkoutData.guests * checkoutData.nights * checkoutData.costPerPersonPerDay,
          tax: 0,
          total: checkoutData.guests * checkoutData.nights * checkoutData.costPerPersonPerDay,
          details: `${checkoutData.guests} guests × ${checkoutData.nights} nights × $${checkoutData.costPerPersonPerDay}/person/day`
        };
      }
      return {
        baseAmount: checkoutData.totalCost,
        cleaningFee: 0,
        petFee: 0,
        damageDeposit: 0,
        subtotal: checkoutData.totalCost,
        tax: 0,
        total: checkoutData.totalCost,
        details: 'Total cabin cost'
      };
    }

    const billingConfig = {
      method: financialSettings.billing_method as any,
      amount: financialSettings.billing_amount,
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
  const totalAmount = billing.total - checkoutData.receiptsTotal;

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
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Final Checkout</h1>
              <p className="text-sm text-muted-foreground">
                Review your stay and complete payment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
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
              <CardDescription>
                Complete record of your stay activities and observations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Arrival Check-in */}
              {arrivalSessions.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Arrival Check-In
                  </h4>
                  {arrivalSessions.map((session, index) => (
                    <div key={session.id} className="bg-muted rounded p-3 mb-2">
                      <div className="text-xs text-muted-foreground mb-2">
                        {new Date(session.check_date).toLocaleDateString()}
                      </div>
                      {session.notes && (
                        <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Daily Check-ins */}
              {dailySessions.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
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
                            <div className="text-sm font-medium">
                              {new Date(session.check_date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {completedTasks} tasks completed
                            </div>
                          </div>
                          
                           {(totalOccupancy as number) > 0 && (
                            <div className="text-xs text-muted-foreground mb-2">
                              Daily occupancy: {totalOccupancy as number} guests
                            </div>
                          )}
                          
                          {responses?.readings && Object.values(responses.readings).some((v: any) => v) && (
                            <div className="text-xs text-muted-foreground mb-2">
                              Readings recorded: {Object.entries(responses.readings)
                                .filter(([_, v]) => v)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ")}
                            </div>
                          )}
                          
                          {session.notes && (
                            <p className="text-sm whitespace-pre-wrap mt-2">{session.notes}</p>
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
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">Survey Responses:</h4>
                  {surveyResponses.map((response, index) => (
                    <div key={response.id} className="bg-muted rounded p-3 mb-2">
                      <div className="text-xs text-muted-foreground mb-2">
                        {new Date().toLocaleDateString()}
                      </div>
                      <p className="text-sm">Survey data recorded</p>
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
              <div className="text-xs text-muted-foreground mb-2">
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
            <CardDescription>
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
                  <p className="text-sm text-muted-foreground">Send payment directly via Venmo</p>
                </div>
              </div>
              <div className="bg-muted rounded p-3 mb-3">
                <p className="text-sm font-medium">Venmo Handle:</p>
                <p className="text-lg font-mono">{checkoutData.venmoHandle}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Amount: ${totalAmount}
                </p>
              </div>
              <Button 
                className="w-full"
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
                  <p className="text-sm text-muted-foreground">Mail a check to the address below</p>
                </div>
              </div>
              <div className="bg-muted rounded p-3">
                <p className="text-sm font-medium mb-2">Mail check to:</p>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{checkoutData.checkAddress.name}</p>
                  <p>{checkoutData.checkAddress.street}</p>
                  <p>
                    {checkoutData.checkAddress.city}, {checkoutData.checkAddress.state} {checkoutData.checkAddress.zip}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t">
                  <p className="text-sm">
                    <span className="font-medium">Amount:</span> ${totalAmount}
                  </p>
                  <p className="text-sm">
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
              <p className="text-sm text-muted-foreground">
                Please complete payment within 7 days. You will receive a confirmation email once payment is processed.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/home")}>
                  Return to Home
                </Button>
                <Button onClick={() => window.print()}>
                  Print Summary
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutFinal;