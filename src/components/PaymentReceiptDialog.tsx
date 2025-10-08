import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Receipt, Download, Mail, Printer, AlertCircle, TestTube2 } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/date-utils';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    family_group: string;
    amount: number;
    amount_paid: number;
    paid_date?: string;
    payment_method?: string;
    payment_reference?: string;
    description?: string;
    notes?: string;
  } | null;
  isTestMode?: boolean;
}

export const PaymentReceiptDialog = ({
  open,
  onOpenChange,
  payment,
  isTestMode = true
}: PaymentReceiptDialogProps) => {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  if (!payment || !organization) return null;

  const receiptNumber = `RCP-${payment.id.substring(0, 8).toUpperCase()}`;
  const receiptDate = payment.paid_date ? parseDateOnly(payment.paid_date) : new Date();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const printContent = document.getElementById('receipt-content');
      if (printContent) {
        const printWindow = window.open('', '', 'height=800,width=600');
        if (printWindow) {
          printWindow.document.write('<html><head><title>Payment Receipt</title>');
          printWindow.document.write('<style>');
          printWindow.document.write(`
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
            .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .receipt-details { margin-bottom: 20px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; }
            .amount-box { background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; border: 2px solid #333; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            @media print { .no-print { display: none; } }
          `);
          printWindow.document.write('</style></head><body>');
          printWindow.document.write(printContent.innerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
        }
      }
      
      toast({
        title: 'Receipt Generated',
        description: 'Payment receipt has been prepared for printing.',
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate receipt. Please try again.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailTest = () => {
    toast({
      title: 'Test Mode Active',
      description: 'Email functionality is in test mode. No email will be sent. Enable in settings after testing.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Receipt
            {isTestMode && (
              <Badge variant="secondary" className="ml-2">
                <TestTube2 className="h-3 w-3 mr-1" />
                Test Mode
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isTestMode && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Receipt generation is in test mode. Review the receipt carefully before enabling automated sending.
              Email functionality is disabled until you approve it in settings.
            </AlertDescription>
          </Alert>
        )}

        <div id="receipt-content" className="space-y-6 p-8 bg-white text-black">
          {/* Receipt Header */}
          <div className="text-center space-y-2 border-b-2 border-black pb-6">
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <p className="text-xl font-semibold">PAYMENT RECEIPT</p>
            <div className="text-sm space-y-1">
              <p>Receipt #: {receiptNumber}</p>
              <p>Date: {format(receiptDate, 'MMMM d, yyyy')}</p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Received From:</span>
              <span>{payment.family_group}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Payment Date:</span>
              <span>{format(receiptDate, 'MMMM d, yyyy')}</span>
            </div>

            {payment.payment_method && (
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Payment Method:</span>
                <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
              </div>
            )}

            {payment.payment_reference && (
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Reference:</span>
                <span>{payment.payment_reference}</span>
              </div>
            )}

            {payment.description && (
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Description:</span>
                <span>{payment.description}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="bg-gray-100 p-6 text-center border-2 border-black my-6">
            <p className="text-sm font-medium mb-2">AMOUNT PAID</p>
            <p className="text-4xl font-bold">${payment.amount_paid.toFixed(2)}</p>
          </div>

          {/* Outstanding Balance */}
          {payment.amount > payment.amount_paid && (
            <Alert>
              <AlertDescription>
                <div className="flex justify-between font-semibold">
                  <span>Outstanding Balance:</span>
                  <span>${(payment.amount - payment.amount_paid).toFixed(2)}</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {payment.notes && (
            <div className="text-sm">
              <p className="font-semibold mb-1">Notes:</p>
              <p className="text-muted-foreground">{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4 mt-6">
            <p>This receipt is for your records.</p>
            <p>For questions, please contact the organization treasurer.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={generating}>
            <Download className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Download'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleEmailTest}
            disabled={!isTestMode}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isTestMode ? 'Test Email' : 'Send Email'}
          </Button>
        </div>

        {isTestMode && (
          <Alert>
            <TestTube2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              To enable automatic receipt generation and emailing, navigate to Settings → Financial Settings → Enable Receipt Generation
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};
