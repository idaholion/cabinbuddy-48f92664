import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PaymentMethodOption, buildDefaultPaymentMethods, visiblePaymentMethods, toDbPaymentMethod } from "@/lib/payment-methods";


interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: {
    id: string;
    family_group: string;
    balanceDue: number;
  };
  /** Optional dialog title override (defaults to "Record Payment - {family group}") */
  title?: string;
  /** Optional save button label override */
  saveLabel?: string;
  /** Hide Venmo from the method list (when Venmo is offered elsewhere) */
  hideVenmo?: boolean;

  /** Admin-configured payment methods (falls back to defaults) */
  methods?: PaymentMethodOption[];

  /** Optional organization payment instructions shown for the selected method */
  paymentInfo?: {
    checkPayableTo?: string;
    checkAddress?: string;
    paypalEmail?: string;
  };

  onSave: (data: {
    amount: number;
    paidDate: string;
    paymentMethod: string;
    paymentReference?: string;
    notes?: string;
  }) => Promise<void>;
}

export const RecordPaymentDialog = ({
  open,
  onOpenChange,
  stay,
  title,
  saveLabel,
  hideVenmo,
  methods,


  paymentInfo,
  onSave,
}: RecordPaymentDialogProps) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState(Math.round(stay.balanceDue * 100) / 100);
  const [paidDate, setPaidDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const methodList = useMemo(() => {
    const base = methods && methods.length > 0
      ? methods
      : buildDefaultPaymentMethods({
          checkPayableTo: paymentInfo?.checkPayableTo,
          checkMailingAddress: paymentInfo?.checkAddress,
          paypalEmail: paymentInfo?.paypalEmail,
        });
    return visiblePaymentMethods(base).filter((m) => !(hideVenmo && m.key === 'venmo'));
  }, [methods, paymentInfo, hideVenmo]);

  const selectedMethod = methodList.find((m) => m.key === paymentMethod);




  const handleSave = async () => {
    if (!paymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Payment amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Build payment reference based on method
      let paymentRef = reference;
      if (paymentMethod === 'check' && checkNumber) {
        paymentRef = checkNumber + (reference ? ` - ${reference}` : '');
      }

      // Methods that aren't real DB enum values are stored as "other",
      // with the chosen label preserved in the reference so it stays readable.
      const dbMethod = toDbPaymentMethod(paymentMethod);
      if (dbMethod === 'other' && paymentMethod !== 'other') {
        const label = selectedMethod?.label || paymentMethod;
        paymentRef = paymentRef ? `${label}: ${paymentRef}` : label;
      }

      await onSave({
        amount,
        paidDate,
        paymentMethod: dbMethod,
        paymentReference: paymentRef || undefined,
        notes: notes || undefined,
      });

      toast({
        title: "Payment recorded",
        description: `$${amount.toFixed(2)} payment has been recorded successfully.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title || `Record Payment - ${stay.family_group}`}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Balance Due</Label>
            <div className="text-2xl font-bold text-muted-foreground">
              ${stay.balanceDue.toFixed(2)}
            </div>
          </div>

          <div>
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Math.round((parseFloat(e.target.value) || 0) * 100) / 100)}
              className="mt-1"
            />
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount(Math.round(stay.balanceDue * 100) / 100)}
              >
                Full Balance
              </Button>
            </div>
          </div>


          <div>
            <Label htmlFor="date">Payment Date</Label>
            <Input
              id="date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {methodList.map((m) => (
                  <SelectItem key={m.key} value={m.key} disabled={!!m.comingSoon}>
                    {m.label}{m.comingSoon ? ' (not yet active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Organization payment instructions for the selected method */}
          {selectedMethod?.instructions && (
            <div className="rounded border bg-muted/40 p-3 text-sm whitespace-pre-line">
              {selectedMethod.instructions}
            </div>
          )}

          {/* Check Number Field - Only show when check is selected */}
          {paymentMethod === 'check' && (
            <div>
              <Label htmlFor="checkNumber">Check Number *</Label>
              <Input
                id="checkNumber"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="e.g., 1234"
                className="mt-1"
              />
            </div>
          )}

          {/* Payment Reference Field - Label comes from the admin config */}
          <div>
            <Label htmlFor="reference">
              {selectedMethod?.referenceLabel || 'Payment Reference/Confirmation #'}
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                paymentMethod === 'check'
                  ? 'Optional memo or note'
                  : 'e.g., Transaction ID, Confirmation #'
              }
              className="mt-1"
            />
          </div>


          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this payment"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Recording..." : (saveLabel || "Record Payment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
