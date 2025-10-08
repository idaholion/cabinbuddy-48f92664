import { useState } from "react";
import { useSeasonSummary } from "@/hooks/useSeasonSummary";
import { usePayments } from "@/hooks/usePayments";
import { BillingCalculator } from "@/lib/billing-calculator";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Moon, 
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertCircle,
  Edit,
  RefreshCw,
  Plus,
  FileText,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditOccupancyDialog } from "@/components/EditOccupancyDialog";
import { AdjustBillingDialog } from "@/components/AdjustBillingDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { SeasonInvoiceDialog } from "@/components/SeasonInvoiceDialog";
import { PaymentReceiptDialog } from "@/components/PaymentReceiptDialog";
import { ExportSeasonDataDialog } from "@/components/ExportSeasonDataDialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { parseDateOnly, calculateNights } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";

export default function SeasonSummary() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const familyParam = searchParams.get('family') || undefined;
  const isAdminView = searchParams.get('admin') === 'true';
  
  const { 
    summary, 
    loading, 
    refetch, 
    createSeasonPayment,
    syncReservationsToPayments,
    updateOccupancy,
    adjustBilling,
  } = useSeasonSummary(year, isAdminView ? familyParam : undefined);
  const { recordPartialPayment } = usePayments();
  const calculator = new BillingCalculator();
  const { isAdmin } = useUserRole();
  const { organization } = useOrganization();

  const [editingOccupancy, setEditingOccupancy] = useState<any>(null);
  const [adjustingBilling, setAdjustingBilling] = useState<any>(null);
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState(false);
  const [selectedFamilyGroupForInvoice, setSelectedFamilyGroupForInvoice] = useState<string | undefined>(undefined);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingOrg, setSyncingOrg] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncReservationsToPayments();
      toast({
        title: "Sync complete",
        description: `Created ${result.created} payment records. ${result.existing} already existed.`,
      });
      if (result.errors.length > 0) {
        console.error('Sync errors:', result.errors);
      }
      refetch();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync calendar data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOrganization = async () => {
    if (!organization?.id) return;
    
    setSyncingOrg(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-organization-payments', {
        body: {
          organizationId: organization.id,
          year,
        },
      });

      if (error) throw error;

      toast({
        title: "Organization sync complete",
        description: `Created ${data.created} payment records for all families. ${data.existing} already existed.`,
      });
      
      if (data.errors && data.errors.length > 0) {
        console.error('Sync errors:', data.errors);
      }
      
      refetch();
    } catch (error) {
      console.error('Organization sync error:', error);
      toast({
        title: "Organization sync failed",
        description: error.message || "Failed to sync organization data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncingOrg(false);
    }
  };

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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Season Data</AlertTitle>
          <AlertDescription>
            Unable to load season summary. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdminView && familyParam ? `${familyParam} - ` : 'My '}Season Summary - {year}
          </h1>
          <p className="text-muted-foreground">
            {summary?.config && (
              `Season: ${format(new Date(year, summary.config.season_start_month - 1, summary.config.season_start_day), 'MMM d')} - ${format(new Date(year, summary.config.season_end_month - 1, summary.config.season_end_day), 'MMM d, yyyy')}`
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdminView ? (
            <Link to={`/admin-season-summary?year=${year}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Summary
              </Button>
            </Link>
          ) : (
            <>
              {isAdmin && (
                <Button variant="default" onClick={handleSyncOrganization} disabled={syncingOrg}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncingOrg ? 'animate-spin' : ''}`} />
                  {syncingOrg ? 'Syncing All...' : 'Sync All Families'}
                </Button>
              )}
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync My Family'}
              </Button>
              <Button variant="outline" onClick={() => setViewingInvoice(true)}>
                <FileText className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
              <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Link to="/financial">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
            </>
          )}
        </div>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{BillingCalculator.formatCurrency(summary.totals.totalCharged)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payments Made</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{BillingCalculator.formatCurrency(summary.totals.totalPaid)}</p>
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
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.stays.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Stays Found</AlertTitle>
              <AlertDescription>
                No reservations found for this season period.
              </AlertDescription>
            </Alert>
          ) : (
            summary.stays.map((stay) => {
              // Check if reservation is upcoming (hasn't started yet)
              const isUpcoming = new Date(stay.reservation.start_date) > new Date();
              
              return (
                <Card key={stay.reservation.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">
                            {format(parseDateOnly(stay.reservation.start_date), 'MMM d')} - {format(parseDateOnly(stay.reservation.end_date), 'MMM d, yyyy')}
                          </span>
                          {isUpcoming && (
                            <Badge variant="outline" className="ml-2">Upcoming</Badge>
                          )}
                        </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingOccupancy({
                          ...stay,
                          id: stay.payment?.id,
                          startDate: parseDateOnly(stay.reservation.start_date),
                          endDate: parseDateOnly(stay.reservation.end_date),
                          family_group: stay.reservation.family_group,
                          dailyOccupancy: stay.payment?.daily_occupancy || [],
                        })}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Occupancy
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="font-medium">{calculateNights(stay.reservation.start_date, stay.reservation.end_date)}</span> nights
                        </span>
                      </div>
                    </div>

                    {!isUpcoming && (
                      <>
                        <div className="space-y-2 border-t pt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Charges</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">
                                {BillingCalculator.formatCurrency(stay.billing.total)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAdjustingBilling({
                                  id: stay.payment?.id,
                                  family_group: stay.reservation.family_group,
                                  totalCharge: stay.billing.total,
                                  manualAdjustment: stay.payment?.manual_adjustment_amount || 0,
                                  adjustmentNotes: stay.payment?.adjustment_notes,
                                  billingLocked: stay.payment?.billing_locked,
                                })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payments Made</span>
                            <span className="font-medium text-green-600">
                              {BillingCalculator.formatCurrency(stay.payment?.amount_paid || 0)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t">
                          <div>
                            <span className="font-semibold text-lg">Balance Due:</span>{" "}
                            <span className="text-xl font-bold text-primary">
                              {BillingCalculator.formatCurrency(stay.billing.total - (stay.payment?.amount_paid || 0))}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Link to={`/reservation/${stay.reservation.id}`}>
                              <Button variant="outline" size="sm">View Details</Button>
                            </Link>
                            {stay.billing.total > (stay.payment?.amount_paid || 0) && (
                              <Button 
                                size="sm"
                                onClick={() => setRecordingPayment({
                                  id: stay.payment?.id,
                                  family_group: stay.reservation.family_group,
                                  totalCharge: stay.billing.total,
                                  totalPaid: stay.payment?.amount_paid || 0,
                                })}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Record Payment
                              </Button>
                            )}
                            {stay.payment && stay.payment.amount_paid > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingReceipt(stay.payment)}
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                Receipt
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {isUpcoming && (
                      <div className="pt-4 border-t">
                        <Link to={`/reservation/${stay.reservation.id}`}>
                          <Button variant="outline" size="sm">View Details</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Total Season Charges:</span>
              <span className="font-semibold">{BillingCalculator.formatCurrency(summary.totals.totalCharged)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Payments Made:</span>
              <span className="font-semibold text-green-600">{BillingCalculator.formatCurrency(summary.totals.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold pt-2 border-t">
              <span>Outstanding Balance:</span>
              <span className="text-primary">{BillingCalculator.formatCurrency(summary.totals.outstandingBalance)}</span>
            </div>
          </div>

          {summary.totals.outstandingBalance > 0 ? (
            <div className="flex gap-3 pt-4">
              <Button size="lg" className="flex-1" onClick={createSeasonPayment}>
                Pay Full Balance
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.print()}>
                <Download className="mr-2 h-5 w-5" />
                Invoice
              </Button>
            </div>
          ) : (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Fully Paid</AlertTitle>
              <AlertDescription className="text-green-700">
                Your season balance has been paid in full!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {editingOccupancy && (
        <EditOccupancyDialog
          open={!!editingOccupancy}
          onOpenChange={(open) => !open && setEditingOccupancy(null)}
          stay={editingOccupancy}
          currentOccupancy={editingOccupancy.dailyOccupancy || []}
          onSave={async (occupancy) => {
            await updateOccupancy(editingOccupancy.id, occupancy);
            setEditingOccupancy(null);
            refetch();
          }}
        />
      )}

      {adjustingBilling && (
        <AdjustBillingDialog
          open={!!adjustingBilling}
          onOpenChange={(open) => !open && setAdjustingBilling(null)}
          stay={{
            id: adjustingBilling.id,
            family_group: adjustingBilling.family_group,
            calculatedAmount: adjustingBilling.totalCharge,
            manualAdjustment: adjustingBilling.manualAdjustment || 0,
            adjustmentNotes: adjustingBilling.adjustmentNotes,
            billingLocked: adjustingBilling.billingLocked,
          }}
          onSave={async (data) => {
            await adjustBilling(
              adjustingBilling.id,
              data.manualAdjustment,
              data.adjustmentNotes,
              data.billingLocked
            );
          }}
        />
      )}

      {recordingPayment && (
        <RecordPaymentDialog
          open={!!recordingPayment}
          onOpenChange={(open) => !open && setRecordingPayment(null)}
          stay={{
            id: recordingPayment.id,
            family_group: recordingPayment.family_group,
            balanceDue: recordingPayment.totalCharge - recordingPayment.totalPaid,
          }}
          onSave={async (data) => {
            await recordPartialPayment(
              recordingPayment.id,
              data.amount,
              data.paidDate,
              data.paymentMethod,
              data.paymentReference,
              data.notes
            );
          }}
        />
      )}

      <SeasonInvoiceDialog
        open={viewingInvoice}
        onOpenChange={setViewingInvoice}
        seasonYear={year}
        seasonData={summary}
        familyGroup={selectedFamilyGroupForInvoice}
      />

      <PaymentReceiptDialog
        open={!!viewingReceipt}
        onOpenChange={(open) => !open && setViewingReceipt(null)}
        payment={viewingReceipt}
        isTestMode={true}
      />

      <ExportSeasonDataDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        seasonYear={year}
        seasonData={summary}
      />
    </div>
  );
}
