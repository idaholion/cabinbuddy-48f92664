import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: {
    id: string;
    family_group: string;
    balanceDue: number;
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
      
      await onSave({
        amount,
        paidDate,
        paymentMethod,
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
          <DialogTitle>Record Payment - {stay.family_group}</DialogTitle>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount(Math.round((stay.balanceDue / 2) * 100) / 100)}
              >
                Half Balance
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

          {/* Payment Reference Field - Label changes based on method */}
          <div>
            <Label htmlFor="reference">
              {paymentMethod === 'check' 
                ? 'Additional Reference (optional)' 
                : paymentMethod === 'venmo' 
                ? 'Venmo Transaction ID' 
                : paymentMethod === 'zelle'
                ? 'Zelle Confirmation #'
                : 'Payment Reference/Confirmation #'}
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                paymentMethod === 'check' 
                  ? 'Optional memo or note'
                  : paymentMethod === 'venmo'
                  ? 'e.g., Transaction ID'
                  : paymentMethod === 'zelle'
                  ? 'e.g., Confirmation number'
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
            {saving ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
