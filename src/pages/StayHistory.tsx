import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, ArrowLeft, Receipt, Edit, FileText, Download, RefreshCw } from "lucide-react";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditOccupancyDialog } from "@/components/EditOccupancyDialog";
import { AdjustBillingDialog } from "@/components/AdjustBillingDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { GuestCostSplitDialog } from "@/components/GuestCostSplitDialog";
import { PaymentReceiptDialog } from "@/components/PaymentReceiptDialog";
import { ExportSeasonDataDialog } from "@/components/ExportSeasonDataDialog";
import { toast } from "sonner";

export default function StayHistory() {
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(0); // 0 = All Years
  const [editOccupancyStay, setEditOccupancyStay] = useState<any>(null);
  const [adjustBillingStay, setAdjustBillingStay] = useState<any>(null);
  const [recordPaymentStay, setRecordPaymentStay] = useState<any>(null);
  const [splitCostStay, setSplitCostStay] = useState<any>(null);
  const [viewReceiptPayment, setViewReceiptPayment] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { reservations, loading: reservationsLoading, refetchReservations } = useReservations();
  const { receipts, loading: receiptsLoading } = useReceipts();
  const { settings: financialSettings, loading: settingsLoading } = useFinancialSettings();
  const { familyGroups } = useFamilyGroups();
  const { isAdmin } = useUserRole();
  const { organization } = useOrganization();
  const { payments, fetchPayments } = usePayments();

  const loading = reservationsLoading || receiptsLoading || settingsLoading;

  // Generate list of years from reservations
  const availableYears = Array.from(
    new Set(
      reservations
        .map(r => new Date(r.start_date).getFullYear())
        .sort((a, b) => b - a)
    )
  );

  useEffect(() => {
    fetchPayments();
  }, [selectedYear, selectedFamilyGroup]);

  const handleSync = async () => {
    try {
      await refetchReservations();
      await fetchPayments();
      toast.success("Data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  };

  const handleSaveOccupancy = async (updatedOccupancy: any[]) => {
    if (!editOccupancyStay?.paymentId || !organization?.id) return;
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({ daily_occupancy: updatedOccupancy })
        .eq('id', editOccupancyStay.paymentId)
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      await fetchPayments();
      toast.success("Occupancy updated successfully");
      setEditOccupancyStay(null);
    } catch (error) {
      toast.error("Failed to update occupancy");
      throw error;
    }
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
      
      await fetchPayments();
      toast.success("Billing adjustment saved successfully");
      setAdjustBillingStay(null);
    } catch (error) {
      toast.error("Failed to save billing adjustment");
      throw error;
    }
  };

  const filteredReservations = reservations
    .filter((reservation) => {
      const checkInDate = new Date(reservation.start_date);
      const checkOutDate = new Date(reservation.end_date);
      const isPast = checkOutDate < new Date();
      const isConfirmed = reservation.status === "confirmed";
      const matchesYear = selectedYear === 0 || checkInDate.getFullYear() === selectedYear;
      const matchesFamily = selectedFamilyGroup === "all" || reservation.family_group === selectedFamilyGroup;
      
      return isPast && isConfirmed && matchesYear && matchesFamily;
    })
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const calculateStayData = (reservation: any) => {
    const checkInDate = new Date(reservation.start_date);
    const checkOutDate = new Date(reservation.end_date);
    const nights = differenceInDays(checkOutDate, checkInDate);
    
    // Find payment record for this reservation
    const payment = payments.find(p => p.reservation_id === reservation.id);
    
    // Find receipts for this reservation
    const stayReceipts = receipts.filter(
      (receipt) => receipt.reservation_id === reservation.id
    );
    const receiptsTotal = stayReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
    
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

    const amountDue = billingAmount - amountPaid;

    return {
      nights,
      receiptsTotal,
      receiptsCount: stayReceipts.length,
      billingAmount,
      amountPaid,
      amountDue,
      billingMethod,
      paymentId: payment?.id,
      paymentStatus: payment?.status,
      dailyOccupancy,
      manualAdjustment: (payment as any)?.manual_adjustment_amount || 0,
      adjustmentNotes: (payment as any)?.adjustment_notes,
      billingLocked: (payment as any)?.billing_locked
    };
  };

  // Calculate summary stats
  const totalStays = filteredReservations.length;
  const totalNights = filteredReservations.reduce((sum, res) => {
    const nights = differenceInDays(new Date(res.end_date), new Date(res.start_date));
    return sum + nights;
  }, 0);
  const totalPaid = filteredReservations.reduce((sum, res) => {
    const stayData = calculateStayData(res);
    return sum + stayData.amountPaid;
  }, 0);

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
        <div>
          <h1 className="text-3xl font-bold mb-2">Stay History</h1>
          <p className="text-muted-foreground">View your past cabin stays and related costs</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Past Stays Found</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't completed any stays yet. Book your next stay to see it here!
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
            <Button variant="outline" onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Data
            </Button>
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
        {filteredReservations.map((reservation) => {
          const stayData = calculateStayData(reservation);
          const checkInDate = new Date(reservation.start_date);
          const checkOutDate = new Date(reservation.end_date);

          return (
            <Card key={reservation.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {format(checkInDate, "MMM d, yyyy")} - {format(checkOutDate, "MMM d, yyyy")}
                      {stayData.paymentStatus && (
                        <Badge variant={
                          stayData.paymentStatus === 'paid' ? 'default' :
                          stayData.paymentStatus === 'partial' ? 'secondary' :
                          stayData.paymentStatus === 'overdue' ? 'destructive' : 'outline'
                        }>
                          {stayData.paymentStatus}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {stayData.nights} {stayData.nights === 1 ? "night" : "nights"} • {reservation.family_group}
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
                          {stayData.dailyOccupancy.reduce((sum: number, day: any) => sum + (day.guests || 0), 0)} total guest-nights
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

                {/* Action Buttons */}
                {stayData.paymentId && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOccupancyStay({
                        startDate: new Date(reservation.start_date),
                        endDate: new Date(reservation.end_date),
                        family_group: reservation.family_group,
                        paymentId: stayData.paymentId,
                        dailyOccupancy: stayData.dailyOccupancy
                      })}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Occupancy
                    </Button>
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
                    {stayData.amountDue > 0 && (
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
                    {stayData.dailyOccupancy && stayData.dailyOccupancy.length > 0 && (
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
                    {stayData.amountPaid > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewReceiptPayment(stayData)}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        View Receipt
                      </Button>
                    )}
                  </div>
                )}
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
      {editOccupancyStay && (
        <EditOccupancyDialog
          open={true}
          onOpenChange={(open) => !open && setEditOccupancyStay(null)}
          stay={editOccupancyStay}
          currentOccupancy={editOccupancyStay.dailyOccupancy || []}
          onSave={handleSaveOccupancy}
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
            // Handle recording the payment via usePayments
            await fetchPayments();
            setRecordPaymentStay(null);
          }}
        />
      )}

      {splitCostStay && splitCostStay.dailyOccupancy && splitCostStay.dailyOccupancy.length > 0 && (
        <GuestCostSplitDialog
          open={!!splitCostStay}
          onOpenChange={(open) => !open && setSplitCostStay(null)}
          organizationId={splitCostStay.organization_id}
          dailyBreakdown={splitCostStay.dailyOccupancy.map((d: any) => ({
            date: d.date,
            guests: d.guests || 0,
            cost: d.cost || 0
          }))}
          totalAmount={splitCostStay.billingAmount || 0}
          sourceUserId={splitCostStay.user_id}
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
