import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Payment {
  id: string;
  amount: number;
  amount_paid: number;
  payment_method?: string;
  payment_reference?: string;
  paid_date?: string;
  notes?: string;
}

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onSave: (data: any) => Promise<void>;
}

export const EditPaymentDialog = ({
  open,
  onOpenChange,
  payment,
  onSave,
}: EditPaymentDialogProps) => {
  const [amountPaid, setAmountPaid] = useState(payment.amount_paid);
  const [paidDate, setPaidDate] = useState(payment.paid_date || '');
  const [paymentMethod, setPaymentMethod] = useState(payment.payment_method || '');
  const [reference, setReference] = useState(payment.payment_reference || '');
  const [notes, setNotes] = useState(payment.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (amountPaid < 0) {
      toast.error("Amount paid cannot be negative");
      return;
    }

    if (amountPaid > payment.amount) {
      toast.error("Amount paid cannot exceed the total amount due");
      return;
    }

    setSaving(true);
    try {
      const status = amountPaid >= payment.amount ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
      const balanceDue = payment.amount - amountPaid;
      
      await onSave({
        amount_paid: amountPaid,
        balance_due: balanceDue,
        status,
        payment_method: paymentMethod || undefined,
        payment_reference: reference || undefined,
        paid_date: paidDate || undefined,
        notes: notes || undefined,
      });
      
      toast.success("Payment details have been updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update payment. Please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Total Amount Due</Label>
            <div className="text-lg font-bold text-muted-foreground">
              ${payment.amount.toFixed(2)}
            </div>
          </div>

          <div>
            <Label htmlFor="amount">Amount Paid</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Balance due: ${(payment.amount - amountPaid).toFixed(2)}
            </p>
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
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reference">Payment Reference</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Check #, Transaction ID"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
