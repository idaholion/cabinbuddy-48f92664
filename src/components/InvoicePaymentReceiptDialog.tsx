import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, Mail, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useOrganization } from '@/hooks/useOrganization';
import type { Invoice } from '@/hooks/useInvoices';

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  paymentAmount: number;
}

export const PaymentReceiptDialog = ({ open, onOpenChange, invoice, paymentAmount }: PaymentReceiptDialogProps) => {
  const { organization } = useOrganization();

  if (!invoice || !organization) return null;

  const newBalance = invoice.balance_due - paymentAmount;
  const receiptDate = new Date().toISOString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Payment Receipt
          </DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="space-y-6 p-6 bg-white text-black">
          <div className="text-center border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            <p className="text-lg font-semibold mt-2">PAYMENT RECEIPT</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold">Receipt Date:</p>
              <p>{format(new Date(receiptDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Invoice #:</p>
              <p>{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Paid By:</p>
              <p>{invoice.family_group}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Payment Date:</p>
              <p>{format(new Date(), 'MMM d, yyyy')}</p>
            </div>
          </div>

          <div className="border-t border-b py-4">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Payment Amount:</span>
              <span className="text-lg font-bold text-success">${paymentAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Previous Balance:</span>
              <span>${invoice.balance_due.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>New Balance:</span>
              <span className={newBalance > 0 ? 'text-destructive' : 'text-success'}>
                ${newBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {newBalance <= 0 && (
            <div className="bg-success/10 border border-success p-4 rounded text-center">
              <p className="font-semibold text-success">Invoice Paid in Full!</p>
              <p className="text-sm">Thank you for your payment.</p>
            </div>
          )}

          {newBalance > 0 && (
            <div className="bg-warning/10 border border-warning p-4 rounded text-center">
              <p className="font-semibold">Partial Payment Applied</p>
              <p className="text-sm">Remaining balance: ${newBalance.toFixed(2)}</p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>This receipt confirms payment has been received and applied to your account.</p>
            <p>For questions, please contact the organization treasurer.</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={() => {
            const printContent = document.getElementById('receipt-content');
            if (printContent) {
              const printWindow = window.open('', '', 'height=800,width=600');
              if (printWindow) {
                printWindow.document.write('<html><head><title>Receipt</title>');
                printWindow.document.write('<style>body { font-family: Arial; padding: 40px; }</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContent.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
              }
            }
          }}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
