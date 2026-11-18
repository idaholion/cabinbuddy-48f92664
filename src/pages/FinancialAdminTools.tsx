import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { AdjustBillingDialog } from "@/components/AdjustBillingDialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function FinancialAdminTools() {
  const { organization } = useOrganization();
  const { toast } = useToast();
  
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [adjustBillingData, setAdjustBillingData] = useState<any>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchReservationsWithPayments();
    }
  }, [organization?.id]);

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
          Stays are billed automatically. This tool is for a deliberate manual correction on one reservation.
        </AlertDescription>
      </Alert>

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
