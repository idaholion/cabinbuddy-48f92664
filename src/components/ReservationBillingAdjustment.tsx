import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { createOrganizationContext, secureSelect, secureUpdate } from "@/lib/secure-queries";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdjustBillingDialog } from "@/components/AdjustBillingDialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";

export default function ReservationBillingAdjustment() {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const context = createOrganizationContext(organization?.id, organization?.is_test_organization, organization?.allocation_model);
  
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
      const { data, error } = await secureSelect('reservations', context)
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
    if (!organization?.id) return;
    setSelectedPayment(null);
    setSelectedReservationId(reservationId);
    setLoadingPayment(true);
    
    try {
      const { data, error } = await secureSelect('payments', context)
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('organization_id', organization.id)
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
    const { data: freshPayment } = await secureSelect('payments', context)
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
    
    const { error } = await secureUpdate('payments', {
        manual_adjustment_amount: data.manualAdjustment,
        adjustment_notes: data.adjustmentNotes,
        billing_locked: data.billingLocked
      }, context)
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

  if (!organization) return <Skeleton className="h-40 w-full" />;

  return (
    <section className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Adjust Billing for Reservation</h2>
        <p className="text-muted-foreground mt-1">
          Discounts, damage charges, and other billing corrections.
        </p>
      </div>
          <div className="space-y-2">
            <Label>Select Reservation</Label>
            <Select value={selectedReservationId} onValueChange={handleReservationSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a reservation..." />
              </SelectTrigger>
              <SelectContent>
                {reservations.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.family_group} - {format(parseDateOnly(r.start_date), 'MMM d')} to {format(parseDateOnly(r.end_date), 'MMM d, yyyy')}
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
                <span className={selectedPayment.manual_adjustment_amount >= 0 ? 'text-primary' : 'text-destructive'}>
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
                  <span className="text-sm text-muted-foreground">🔒 Billing is locked</span>
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



      {/* Adjust Billing Dialog */}
      {adjustBillingData && (
        <AdjustBillingDialog
          open={!!adjustBillingData}
          onOpenChange={(open) => !open && setAdjustBillingData(null)}
          stay={adjustBillingData}
          onSave={handleSaveAdjustment}
        />
      )}
    </section>
  );
}
