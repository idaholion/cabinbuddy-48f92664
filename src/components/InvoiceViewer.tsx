import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Printer, Mail, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import type { Invoice } from '@/hooks/useInvoices';

interface InvoiceViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export const InvoiceViewer = ({ open, onOpenChange, invoice }: InvoiceViewerProps) => {
  const { organization } = useOrganization();
  const { toast } = useToast();

  if (!invoice || !organization) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partial': return 'secondary';
      case 'overdue': return 'destructive';
      case 'sent': return 'outline';
      default: return 'secondary';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const printContent = document.getElementById('invoice-content');
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=600');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Invoice</title>');
        printWindow.document.write('<style>body { font-family: Arial; padding: 40px; } .invoice-header { text-align: center; margin-bottom: 30px; } .invoice-details { margin: 20px 0; } table { width: 100%; border-collapse: collapse; } th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; } .total-row { font-weight: bold; background: #f5f5f5; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {invoice.invoice_number}
            </span>
            <Badge variant={getStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div id="invoice-content" className="space-y-6 p-8 bg-white text-black">
          {/* Invoice Header */}
          <div className="invoice-header text-center border-b-2 border-black pb-6">
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <p className="text-xl font-semibold mt-2">INVOICE</p>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-6 invoice-details">
            <div>
              <p className="font-semibold">Bill To:</p>
              <p className="text-lg">{invoice.family_group}</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Invoice #:</span> {invoice.invoice_number}</p>
              <p><span className="font-semibold">Issue Date:</span> {format(new Date(invoice.issue_date), 'MMM d, yyyy')}</p>
              <p><span className="font-semibold">Due Date:</span> {format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2">Description</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Rate</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items?.map((item: any, index: number) => (
                <tr key={index} className="border-b">
                  <td className="py-3">{item.description}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">${item.rate.toFixed(2)}</td>
                  <td className="text-right">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b">
                <td colSpan={3} className="text-right py-2 font-semibold">Subtotal:</td>
                <td className="text-right py-2">${invoice.subtotal.toFixed(2)}</td>
              </tr>
              <tr className="border-b">
                <td colSpan={3} className="text-right py-2 font-semibold">Tax:</td>
                <td className="text-right py-2">${invoice.tax_amount.toFixed(2)}</td>
              </tr>
              <tr className="total-row">
                <td colSpan={3} className="text-right py-3 font-bold text-lg">Total:</td>
                <td className="text-right py-3 font-bold text-lg">${invoice.total_amount.toFixed(2)}</td>
              </tr>
              {invoice.amount_paid > 0 && (
                <>
                  <tr>
                    <td colSpan={3} className="text-right py-2">Amount Paid:</td>
                    <td className="text-right py-2">-${invoice.amount_paid.toFixed(2)}</td>
                  </tr>
                  <tr className="total-row">
                    <td colSpan={3} className="text-right py-3 font-bold">Balance Due:</td>
                    <td className="text-right py-3 font-bold">${invoice.balance_due.toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6">
              <p className="font-semibold mb-2">Notes:</p>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Instructions */}
          <Alert className="mt-6">
            <AlertDescription>
              <p className="font-semibold mb-2">Payment Instructions:</p>
              <p className="text-sm">Please make payment by the due date. Contact the organization treasurer for payment methods.</p>
            </AlertDescription>
          </Alert>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
