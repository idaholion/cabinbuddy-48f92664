import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePaymentSync } from "@/hooks/usePaymentSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, DollarSign, AlertCircle, RefreshCw, Link2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { CleanupDuplicatePayments } from "@/components/CleanupDuplicatePayments";
import { AdjustBillingDialog } from "@/components/AdjustBillingDialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function FinancialAdminTools() {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { syncing, syncPayments } = usePaymentSync();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [fixing, setFixing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [showFixConfirmDialog, setShowFixConfirmDialog] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [adjustBillingData, setAdjustBillingData] = useState<any>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchOrphanedCount();
      fetchAvailableYears();
      fetchReservationsWithPayments();
    }
  }, [organization?.id]);

  const fetchAvailableYears = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('start_date')
        .eq('organization_id', organization.id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      
      const years = [...new Set(data?.map(r => new Date(r.start_date).getFullYear()) || [])];
      setAvailableYears(years.sort((a, b) => b - a));
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchOrphanedCount = async () => {
    if (!organization?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .is('reservation_id', null);
      
      if (error) throw error;
      setOrphanedCount(count || 0);
    } catch (error) {
      console.error('Error fetching orphaned count:', error);
    }
  };

  const handleSyncPayments = async () => {
    if (!organization?.id) return;
    
    const result = await syncPayments(organization.id, selectedYear);
    
    if (result?.success) {
      toast({
        title: "Sync Complete",
        description: `Created ${result.created} new payment records from ${result.total} reservations.`,
      });
    }
  };

  const handleFixEmptyOccupancy = async () => {
    if (!organization?.id) return;
    
    setFixing(true);
    try {
      const { data, error } = await supabase.rpc('fix_empty_occupancy_payments', {
        p_organization_id: organization.id
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; updated_count: number; message: string };
      toast({
        title: "Fix Complete",
        description: result.message || 'Fixed empty occupancy charges',
      });
      setShowFixConfirmDialog(false);
    } catch (error: any) {
      console.error('Error fixing payments:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix payments",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  const handleLinkOrphanedPayments = async () => {
    if (!organization?.id) return;
    
    setLinking(true);
    try {
      const { data, error } = await supabase.rpc('link_orphaned_payments_to_reservations', {
        p_organization_id: organization.id
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; linked_count: number; message: string };
      toast({
        title: "Linking Complete",
        description: result.message || `Linked ${result.linked_count} orphaned payments`,
      });
      
      // Refresh orphaned count
      await fetchOrphanedCount();
    } catch (error: any) {
      console.error('Error linking payments:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link orphaned payments",
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };

  const fetchReservationsWithPayments = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id, 
          family_group, 
          start_date, 
          end_date,
          payments (
            id,
            amount,
            manual_adjustment_amount,
            adjustment_notes,
            billing_locked,
            amount_paid
          )
        `)
        .eq('organization_id', organization.id)
        .order('start_date', { ascending: false })
        .limit(100);
      
      if (!error && data) {
        setReservations(data.filter(r => r.payments && r.payments.length > 0));
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const handleReservationSelect = async (reservationId: string) => {
    setSelectedReservationId(reservationId);
    setLoadingPayment(true);
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('organization_id', organization!.id)
        .single();
      
      if (!error && data) {
        setSelectedPayment(data);
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleOpenAdjustBilling = async () => {
    if (!selectedPayment) return;
    
    // Fetch fresh data to avoid stale state
    const { data: freshPayment } = await supabase
      .from('payments')
      .select('amount, manual_adjustment_amount, adjustment_notes, billing_locked, family_group')
      .eq('id', selectedPayment.id)
      .single();
    
    if (freshPayment) {
      const reservation = reservations.find(r => r.id === selectedReservationId);
      setAdjustBillingData({
        id: selectedPayment.id,
        family_group: reservation?.family_group || freshPayment.family_group,
        paymentId: selectedPayment.id,
        calculatedAmount: freshPayment.amount - (freshPayment.manual_adjustment_amount || 0),
        manualAdjustment: freshPayment.manual_adjustment_amount || 0,
        adjustmentNotes: freshPayment.adjustment_notes,
        billingLocked: freshPayment.billing_locked
      });
    }
  };

  const handleSaveAdjustment = async (data: { 
    manualAdjustment: number; 
    adjustmentNotes: string; 
    billingLocked: boolean 
  }) => {
    if (!adjustBillingData?.paymentId || !organization?.id) return;
    
    const { error } = await supabase
      .from('payments')
      .update({
        manual_adjustment_amount: data.manualAdjustment,
        adjustment_notes: data.adjustmentNotes,
        billing_locked: data.billingLocked
      })
      .eq('id', adjustBillingData.paymentId)
      .eq('organization_id', organization.id);
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Billing adjustment saved successfully",
    });
    
    // Refresh data
    await fetchReservationsWithPayments();
    await handleReservationSelect(selectedReservationId);
    setAdjustBillingData(null);
  };

  if (!organization) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader
          title="Financial Admin Tools"
          subtitle="Loading organization data..."
        />
        <div className="space-y-4 mt-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <PageHeader
        title="Financial Admin Tools"
        subtitle="Reconciliation and data maintenance tools for organization finances"
      />

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          These tools are designed for data reconciliation and maintenance. Use them when you need to backfill missing data or fix inconsistencies.
        </AlertDescription>
      </Alert>

      {/* Sync Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>Sync Payments for Year</CardTitle>
          </div>
          <CardDescription>
            Creates payment records for reservations based on billing configuration and check-in sessions. 
            Use this to backfill missing payments or reconcile data after configuration changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Select Year:</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSyncPayments} 
              disabled={syncing}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {syncing ? 'Syncing...' : 'Sync Payments'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This will create payment records for all reservations in {selectedYear} that don't already have payments. 
            Existing payments will not be modified.
          </p>
        </CardContent>
      </Card>

      {/* Fix Empty Occupancy Charges */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <CardTitle>Fix Empty Occupancy Charges</CardTitle>
          </div>
          <CardDescription>
            Sets payments with missing or null daily_occupancy data to $0.00. This is a legacy data cleanup tool.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ One-time cleanup tool:</strong> This operation sets all payments with missing occupancy data to $0.00. 
              Once run, it typically doesn't need to be run again unless you're backfilling old data.
            </AlertDescription>
          </Alert>
          <Button 
            variant="destructive" 
            onClick={() => setShowFixConfirmDialog(true)}
            disabled={fixing}
          >
            {fixing ? 'Fixing...' : 'Fix Empty Occupancy Charges'}
          </Button>
        </CardContent>
      </Card>

      {/* Link Orphaned Payments */}
      {orphanedCount > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle>Link Orphaned Payments</CardTitle>
            </div>
            <CardDescription>
              Automatically links payment records to matching reservations based on family group and date overlap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Found <strong>{orphanedCount}</strong> payment{orphanedCount !== 1 ? 's' : ''} not linked to any reservation.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleLinkOrphanedPayments}
              disabled={linking}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {linking ? 'Linking...' : `Link ${orphanedCount} Orphaned Payment${orphanedCount !== 1 ? 's' : ''}`}
            </Button>
            <p className="text-sm text-muted-foreground">
              This will attempt to match orphaned payments to reservations based on the family group name and overlapping dates.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Adjust Billing for Reservation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Adjust Billing for Reservation</CardTitle>
          </div>
          <CardDescription>
            Manually adjust billing amounts for specific reservations. Use this for special circumstances
            like early checkout discounts, damage charges, or other billing corrections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Reservation</Label>
            <Select value={selectedReservationId} onValueChange={handleReservationSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a reservation..." />
              </SelectTrigger>
              <SelectContent>
                {reservations.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.family_group} - {format(new Date(r.start_date), 'MMM d')} to {format(new Date(r.end_date), 'MMM d, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {loadingPayment && <Skeleton className="h-20" />}
          
          {selectedPayment && !loadingPayment && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Current Amount:</span>
                <span>${selectedPayment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Manual Adjustment:</span>
                <span className={selectedPayment.manual_adjustment_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {selectedPayment.manual_adjustment_amount >= 0 ? '+' : ''}${selectedPayment.manual_adjustment_amount?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount Paid:</span>
                <span>${selectedPayment.amount_paid?.toFixed(2) || '0.00'}</span>
              </div>
              {selectedPayment.adjustment_notes && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Notes: {selectedPayment.adjustment_notes}</span>
                </div>
              )}
              {selectedPayment.billing_locked && (
                <div className="pt-2">
                  <span className="text-sm text-amber-600">🔒 Billing is locked</span>
                </div>
              )}
            </div>
          )}
          
          <Button 
            onClick={handleOpenAdjustBilling}
            disabled={!selectedPayment || loadingPayment}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Adjust Billing
          </Button>
        </CardContent>
      </Card>

      {/* Cleanup Duplicate Payments */}
      <CleanupDuplicatePayments />

      {/* Confirmation Dialog for Fix Empty Occupancy */}
      <AlertDialog open={showFixConfirmDialog} onOpenChange={setShowFixConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set all payments with missing or null daily_occupancy data to $0.00. 
              This action cannot be undone automatically.
              <br /><br />
              This is typically used as a one-time cleanup for legacy data. Make sure you understand 
              the implications before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFixEmptyOccupancy} className="bg-destructive hover:bg-destructive/90">
              Confirm Fix
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjust Billing Dialog */}
      {adjustBillingData && (
        <AdjustBillingDialog
          open={!!adjustBillingData}
          onOpenChange={(open) => !open && setAdjustBillingData(null)}
          stay={adjustBillingData}
          onSave={handleSaveAdjustment}
        />
      )}
    </div>
  );
}
