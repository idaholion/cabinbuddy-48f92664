import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSeasonSummary } from "@/hooks/useSeasonSummary";
import { BillingCalculator } from "@/lib/billing-calculator";
import { Calendar, AlertTriangle, DollarSign, CreditCard, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";

const SeasonSummary = () => {
  const { summary, loading, createSeasonPayment } = useSeasonSummary();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingSpinner size="lg" />
        <p className="text-center mt-4 text-muted-foreground">Loading season summary...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Season Data</AlertTitle>
          <AlertDescription>
            Unable to load season summary. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const daysUntilDeadline = differenceInDays(summary.config.paymentDeadline, new Date());
  const hasOutstanding = summary.totals.outstandingBalance > 0;

  const getPaymentStatusBadge = (payment: any) => {
    if (!payment) return <Badge variant="outline">PENDING</Badge>;
    
    if (payment.status === 'paid') return <Badge className="bg-green-500">PAID</Badge>;
    if (payment.status === 'deferred') return <Badge className="bg-yellow-500">DEFERRED</Badge>;
    if (payment.status === 'overdue') return <Badge variant="destructive">OVERDUE</Badge>;
    return <Badge variant="outline">PENDING</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          My Season Summary - {new Date().getFullYear()}
        </h1>
        <p className="text-xl text-muted-foreground">
          {format(summary.config.startDate, 'MMMM d, yyyy')} - {format(summary.config.endDate, 'MMMM d, yyyy')}
        </p>
        <p className="text-lg">
          Payment Deadline: {format(summary.config.paymentDeadline, 'MMM d, yyyy')} 
          {daysUntilDeadline > 0 && (
            <span className="text-muted-foreground ml-2">({daysUntilDeadline} days left)</span>
          )}
          {daysUntilDeadline < 0 && (
            <span className="text-destructive ml-2">(Overdue by {Math.abs(daysUntilDeadline)} days)</span>
          )}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totals.totalStays}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Nights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totals.totalNights}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{BillingCalculator.formatCurrency(summary.totals.totalCharged)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{BillingCalculator.formatCurrency(summary.totals.totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stay-by-Stay Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Stay-by-Stay Breakdown
          </CardTitle>
          <CardDescription>Detailed billing for each reservation this season</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.stays.length === 0 ? (
            <Alert>
              <AlertTitle>No Reservations</AlertTitle>
              <AlertDescription>
                You don't have any reservations during this season.
              </AlertDescription>
            </Alert>
          ) : (
            summary.stays.map((stay, index) => (
              <div key={stay.reservation.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">
                      {format(new Date(stay.reservation.start_date), 'MMM d')} - {format(new Date(stay.reservation.end_date), 'MMM d')} ({stay.billing.totalDays} nights)
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Reserved: {stay.reservation.guests} guests</span>
                      {stay.hasCompleteData && stay.billing.averageGuests && (
                        <span>Actual avg: {stay.billing.averageGuests.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  {getPaymentStatusBadge(stay.payment)}
                </div>

                {!stay.hasCompleteData && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Missing Check-in Data</AlertTitle>
                    <AlertDescription>
                      {stay.missingCheckIns.length} day(s) of check-in data missing. Billing is estimated.
                      <Link to="/daily-check-in" className="underline ml-2">
                        Complete check-in data →
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Amount Due</p>
                    <p className="text-2xl font-bold">{BillingCalculator.formatCurrency(stay.billing.total)}</p>
                    {!stay.hasCompleteData && (
                      <p className="text-xs text-muted-foreground">*Estimated based on available data</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link to={`/reservation/${stay.reservation.id}`}>View Details</Link>
                    </Button>
                    {!stay.payment?.amount_paid && (
                      <Button asChild>
                        <Link to={`/checkout-final?reservation=${stay.reservation.id}`}>Pay Now</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Season Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Season Payment Summary
          </CardTitle>
          <CardDescription>Your total season balance and payment options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Total Season Charges:</span>
              <span className="font-semibold">{BillingCalculator.formatCurrency(summary.totals.totalCharged)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Already Paid:</span>
              <span className="font-semibold">{BillingCalculator.formatCurrency(summary.totals.totalPaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-xl">
              <span className="font-bold">Outstanding Balance:</span>
              <span className={`font-bold ${hasOutstanding ? 'text-primary' : 'text-green-500'}`}>
                {BillingCalculator.formatCurrency(summary.totals.outstandingBalance)}
              </span>
            </div>
          </div>

          {hasOutstanding && (
            <div className="flex gap-3 pt-4">
              <Button size="lg" className="flex-1" onClick={createSeasonPayment}>
                <CreditCard className="mr-2 h-5 w-5" />
                Pay Full Season Balance
              </Button>
              <Button variant="outline" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Download Invoice
              </Button>
            </div>
          )}

          {!hasOutstanding && (
            <Alert className="bg-green-50 border-green-200">
              <AlertTitle className="text-green-800">All Paid Up!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your season balance has been paid in full. Thank you!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SeasonSummary;
