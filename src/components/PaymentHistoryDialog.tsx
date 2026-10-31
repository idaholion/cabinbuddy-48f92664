import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Receipt, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditPaymentDialog } from "./EditPaymentDialog";
import { PaymentLinesList } from "./PaymentLinesList";
import { FamilyStayPayment, listFamilyStayPayments } from "@/lib/payment-transactions";

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
  /** Receipt purchases credited against this stay */
  receiptsCredited?: number;
  /** Number of receipts credited against this stay */
  receiptsCount?: number;
  /** Running ledger balance after this stay (negative = credit) */
  balanceAfterStay?: number;
  /** Needed to offer the whole family's payment history, not just this stay */
  organizationId?: string;
  onPaymentUpdated: () => void;
}

export const PaymentHistoryDialog = ({
  open,
  onOpenChange,
  paymentId,
  familyGroup,
  totalAmount,
  receiptsCredited = 0,
  receiptsCount = 0,
  balanceAfterStay,
  organizationId,
  onPaymentUpdated,
}: PaymentHistoryDialogProps) => {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState(false);
  const [linesAvailable, setLinesAvailable] = useState<boolean | null>(null);
  // "stay" = only the stay the dialog was opened from; otherwise a year or "all"
  const [scope, setScope] = useState<string>("stay");
  const [familyStays, setFamilyStays] = useState<FamilyStayPayment[] | null>(null);

  useEffect(() => {
    if (open && paymentId) {
      setScope("stay");
      fetchPayment();
      fetchFamilyStays();
    }
  }, [open, paymentId]);

  const fetchFamilyStays = async () => {
    if (!organizationId || !familyGroup) return;
    try {
      setFamilyStays(await listFamilyStayPayments(organizationId, familyGroup));
    } catch (error) {
      console.error('Error fetching family payment history:', error);
    }
  };

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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              {/* Which payments to show: just this stay, one year, or everything */}
              {familyStays && familyStays.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Show payments for:</span>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stay">This stay only</SelectItem>
                      {Array.from(new Set(familyStays.map((s) => s.year).filter((y): y is number => y !== null)))
                        .sort((a, b) => b - a)
                        .map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}{y === new Date().getFullYear() ? " (year to date)" : ""}
                          </SelectItem>
                        ))}
                      <SelectItem value="all">All years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scope === "stay" ? (
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Receipts Credited{receiptsCount > 0 ? ` (${receiptsCount})` : ''}:
                      </span>
                      <span className="font-medium">${receiptsCredited.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="font-semibold">Balance Due:</span>
                      <span className={`font-bold ${balanceDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        ${balanceDue.toFixed(2)}
                      </span>
                    </div>
                    {balanceAfterStay !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {balanceAfterStay < 0 ? 'Credit Remaining After This Stay:' : 'Running Balance After This Stay:'}
                        </span>
                        <span className={`font-medium ${
                          balanceAfterStay > 0 ? 'text-destructive' : balanceAfterStay < 0 ? 'text-green-600' : ''
                        }`}>
                          ${Math.abs(balanceAfterStay).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>


                  <PaymentLinesList
                    paymentId={payment.id}
                    amountPaid={Number(payment.amount_paid) || 0}
                    onAvailability={setLinesAvailable}
                    onChanged={async () => {
                      await fetchPayment();
                      onPaymentUpdated();
                    }}
                  />

                  {/* Legacy combined payment details (before payment lines existed) */}
                  {linesAvailable !== false ? null : payment.amount_paid > 0 ? (
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
              ) : (
                <FamilyPaymentsView
                  stays={(familyStays || []).filter((s) => scope === "all" || s.year === Number(scope))}
                  onChanged={async () => {
                    await fetchPayment();
                    await fetchFamilyStays();
                    onPaymentUpdated();
                  }}
                />
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

/** Every stay's payments for the chosen year(s), each with its own editable lines. */
const FamilyPaymentsView = ({ stays, onChanged }: { stays: FamilyStayPayment[]; onChanged: () => void }) => {
  if (stays.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No payments found for this period</p>;
  }
  const totalPaid = Math.round(stays.reduce((s, st) => s + st.amountPaid, 0) * 100) / 100;
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm bg-muted/50 rounded-lg px-4 py-2">
        <span className="text-muted-foreground">Total paid across these stays:</span>
        <span className="font-semibold">${totalPaid.toFixed(2)}</span>
      </div>
      {stays.map((st) => (
        <Card key={st.paymentId} className="p-3 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
            <span className="font-semibold text-sm">{st.stayLabel}</span>
            <span className="text-xs text-muted-foreground">
              Charges ${st.amount.toFixed(2)} · Paid ${st.amountPaid.toFixed(2)}
            </span>
          </div>
          <PaymentLinesList
            paymentId={st.paymentId}
            amountPaid={st.amountPaid}
            onChanged={onChanged}
          />
        </Card>
      ))}
    </div>
  );
};
