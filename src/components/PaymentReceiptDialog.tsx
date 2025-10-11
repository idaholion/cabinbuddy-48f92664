import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/date-utils';

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
  isTestMode: boolean;
}

export const PaymentReceiptDialog = ({ open, onOpenChange, payment, isTestMode }: PaymentReceiptDialogProps) => {
  if (!payment) return null;

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
            <h1 className="text-2xl font-bold">Payment Receipt</h1>
            {isTestMode && <p className="text-sm text-muted-foreground">(Test Mode)</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold">Receipt Date:</p>
              <p>{format(new Date(), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Payment ID:</p>
              <p>{payment.id?.substring(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Family Group:</p>
              <p>{payment.family_group}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Payment Date:</p>
              <p>{payment.paid_date ? format(parseDateOnly(payment.paid_date), 'MMM d, yyyy') : 'N/A'}</p>
            </div>
          </div>

          <div className="border-t border-b py-4">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Amount:</span>
              <span className="text-lg font-bold text-success">${payment.amount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Payment Method:</span>
              <span>{payment.payment_method || 'N/A'}</span>
            </div>
            {payment.payment_reference && (
              <div className="flex justify-between text-sm mt-2">
                <span>Reference:</span>
                <span>{payment.payment_reference}</span>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>This receipt confirms payment has been received.</p>
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
