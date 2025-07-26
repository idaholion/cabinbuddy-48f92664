import { useState, useEffect } from "react";
import { ArrowLeft, DollarSign, Users, Calendar, CreditCard, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

const CheckoutFinal = () => {
  const navigate = useNavigate();
  const [arrivalNotes, setArrivalNotes] = useState("");
  const [dailyNotes, setDailyNotes] = useState("");
  const [surveyData, setSurveyData] = useState("");

  // Load notes and survey data from localStorage
  useEffect(() => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      
      // Load arrival checklist notes
      const arrivalData = localStorage.getItem(`arrival_checkin_${organizationCode}`);
      if (arrivalData) {
        const arrival = JSON.parse(arrivalData);
        setArrivalNotes(arrival.notes || "");
      }
      
      // Load daily checklist notes
      const dailyData = localStorage.getItem(`daily_checkin_${organizationCode}`);
      if (dailyData) {
        const daily = JSON.parse(dailyData);
        setDailyNotes(daily.notes || "");
      }
      
      // Load cabin coalition survey data
      const surveyDataStored = localStorage.getItem(`cabin_survey_${organizationCode}`);
      if (surveyDataStored) {
        setSurveyData(surveyDataStored);
      }
    }
  }, []);

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

  const calculateSubtotal = () => {
    if (checkoutData.financialMethod === "per-person-per-day") {
      return checkoutData.guests * checkoutData.nights * checkoutData.costPerPersonPerDay;
    }
    return checkoutData.totalCost;
  };

  const subtotal = calculateSubtotal();
  const totalAmount = subtotal - checkoutData.receiptsTotal;

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
              <h1 className="text-2xl font-semibold text-foreground">Final Checkout</h1>
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

        {/* Stay Notes & Survey Data */}
        {(arrivalNotes || dailyNotes || surveyData) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Stay Report
              </CardTitle>
              <CardDescription>
                Notes and observations from your stay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {arrivalNotes && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Arrival Check-In Notes:</h4>
                  <div className="bg-muted rounded p-3">
                    <p className="text-sm whitespace-pre-wrap">{arrivalNotes}</p>
                  </div>
                </div>
              )}
              
              {dailyNotes && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Daily Check-In Notes:</h4>
                  <div className="bg-muted rounded p-3">
                    <p className="text-sm whitespace-pre-wrap">{dailyNotes}</p>
                  </div>
                </div>
              )}
              
              {surveyData && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Cabin Coalition Survey:</h4>
                  <div className="bg-muted rounded p-3">
                    <p className="text-sm whitespace-pre-wrap">{surveyData}</p>
                  </div>
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
              {checkoutData.financialMethod === "per-person-per-day" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate per person per day:</span>
                    <span className="font-medium">${checkoutData.costPerPersonPerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {checkoutData.guests} guests × {checkoutData.nights} nights × ${checkoutData.costPerPersonPerDay}:
                    </span>
                    <span className="font-medium">${subtotal}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total cabin cost:</span>
                  <span className="font-medium">${subtotal}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Less: Receipts submitted:</span>
                <span className="font-medium text-green-600">-${checkoutData.receiptsTotal}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount Due:</span>
                <span className="text-primary">${totalAmount}</span>
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