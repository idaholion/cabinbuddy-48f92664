import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInvoices, type Invoice } from '@/hooks/useInvoices';
import { DollarSign } from 'lucide-react';
import { PaymentReceiptDialog } from './InvoicePaymentReceiptDialog';

interface RecordInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export const RecordInvoicePaymentDialog = ({ open, onOpenChange, invoice }: RecordInvoicePaymentDialogProps) => {
  const { recordPayment } = useInvoices();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [reference, setReference] = useState('');
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const [receiptAmount, setReceiptAmount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);

  if (!invoice) return null;

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;

    const success = await recordPayment(invoice.id, paymentAmount, paymentMethod, reference);
    
    if (success) {
      // Show receipt dialog
      setReceiptInvoice(invoice);
      setReceiptAmount(paymentAmount);
      setShowReceipt(true);
      
      // Reset form
      setAmount('');
      setPaymentMethod('check');
      setReference('');
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Record Payment - {invoice.invoice_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Invoice Total:</span>
                <span className="font-medium">${invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Amount Paid:</span>
                <span className="font-medium">${invoice.amount_paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span>Balance Due:</span>
                <span className="text-destructive">${invoice.balance_due.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={invoice.balance_due}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference">Reference/Notes (Optional)</Label>
              <Textarea
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Check number, transaction ID, etc."
              />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentReceiptDialog
        open={showReceipt}
        onOpenChange={setShowReceipt}
        invoice={receiptInvoice}
        paymentAmount={receiptAmount}
      />
    </>
  );
};
