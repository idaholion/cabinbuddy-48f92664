import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Edit, Receipt, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditPaymentDialog } from "./EditPaymentDialog";

interface Payment {
  id: string;
  amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  payment_method?: string;
  payment_reference?: string;
  paid_date?: string;
  notes?: string;
}

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  familyGroup: string;
  totalAmount: number;
  onPaymentUpdated: () => void;
}

export const PaymentHistoryDialog = ({
  open,
  onOpenChange,
  paymentId,
  familyGroup,
  totalAmount,
  onPaymentUpdated,
}: PaymentHistoryDialogProps) => {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState(false);

  useEffect(() => {
    if (open && paymentId) {
      fetchPayment();
    }
  }, [open, paymentId]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      setPayment(data);
    } catch (error) {
      console.error('Error fetching payment:', error);
      toast.error("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = async (updates: any) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId);

      if (error) throw error;
      
      toast.success("Payment updated successfully");
      await fetchPayment();
      onPaymentUpdated();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error("Failed to update payment");
      throw error;
    }
  };

  const getPaymentMethodBadgeColor = (method?: string) => {
    if (!method) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    
    switch (method.toLowerCase()) {
      case 'check':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'venmo':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100';
      case 'zelle':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'bank_transfer':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  if (!payment) return null;

  const balanceDue = payment.balance_due || (payment.amount - payment.amount_paid);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Details - {familyGroup}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount Due:</span>
                  <span className="font-medium">${payment.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium">${payment.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold">Balance Due:</span>
                  <span className={`font-bold ${balanceDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    ${balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              {payment.amount_paid > 0 ? (
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {payment.payment_method && (
                          <Badge className={getPaymentMethodBadgeColor(payment.payment_method)}>
                            {payment.payment_method.replace('_', ' ')}
                          </Badge>
                        )}
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        {payment.paid_date && (
                          <div>
                            <span className="font-medium">Payment Date:</span> {format(new Date(payment.paid_date), 'MMM d, yyyy')}
                          </div>
                        )}
                        
                        {payment.payment_reference && (
                          <div>
                            <span className="font-medium">Reference:</span> {payment.payment_reference}
                          </div>
                        )}
                        
                        {payment.notes && (
                          <div>
                            <span className="font-medium">Notes:</span> {payment.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPayment(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No payments recorded yet</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {editingPayment && payment && (
        <EditPaymentDialog
          open={true}
          onOpenChange={(open) => !open && setEditingPayment(false)}
          payment={payment}
          onSave={async (updates) => {
            await handleEditPayment(updates);
            setEditingPayment(false);
          }}
        />
      )}
    </>
  );
};
