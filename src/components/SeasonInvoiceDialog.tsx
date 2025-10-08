import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, Mail, Printer, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/date-utils';
import { useOrganization } from '@/hooks/useOrganization';

interface SeasonInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonYear?: number; // Optional for backward compatibility
  year?: number; // Alternative prop name
  seasonData?: {
    config: any;
    stays: any[];
    totals: any;
  } | null;
  familyGroup?: string;
  familyGroupOverride?: string; // For admin view
  isAdminView?: boolean;
}

export const SeasonInvoiceDialog = ({
  open,
  onOpenChange,
  seasonYear,
  year,
  seasonData,
  familyGroup,
  familyGroupOverride,
  isAdminView = false
}: SeasonInvoiceDialogProps) => {
  const { organization } = useOrganization();
  const [generating, setGenerating] = useState(false);

  const actualYear = year || seasonYear || new Date().getFullYear();
  const actualFamilyGroup = familyGroupOverride || familyGroup;

  if (!seasonData || !organization) return null;

  // Filter stays by family group if specified
  const filteredStays = familyGroup 
    ? seasonData.stays.filter(s => s.reservation.family_group === familyGroup)
    : seasonData.stays;

  // Calculate totals for filtered stays
  const invoiceTotals = filteredStays.reduce((acc, stay) => ({
    totalNights: acc.totalNights + (stay.billing?.nights || 0),
    totalCharges: acc.totalCharges + (stay.billing?.total || 0),
    totalPaid: acc.totalPaid + (stay.payment?.amount_paid || 0),
    balanceDue: acc.balanceDue + ((stay.billing?.total || 0) - (stay.payment?.amount_paid || 0))
  }), { totalNights: 0, totalCharges: 0, totalPaid: 0, balanceDue: 0 });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      // Create printable HTML content
      const printContent = document.getElementById('invoice-content');
      if (printContent) {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
          printWindow.document.write('<html><head><title>Invoice</title>');
          printWindow.document.write('<style>');
          printWindow.document.write(`
            body { font-family: Arial, sans-serif; padding: 20px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .totals { text-align: right; font-weight: bold; }
            @media print { .no-print { display: none; } }
          `);
          printWindow.document.write('</style></head><body>');
          printWindow.document.write(printContent.innerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Season {seasonYear} Invoice
            {familyGroup && <Badge variant="outline">{familyGroup}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Preview invoice before downloading or printing. Email functionality is in test mode.
          </AlertDescription>
        </Alert>

        <div id="invoice-content" className="space-y-6 p-6 bg-white text-black">
          {/* Invoice Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <p className="text-lg">Season {seasonYear} Invoice</p>
            <p className="text-sm text-muted-foreground">
              {format(parseDateOnly(seasonData.config.startDate), 'MMMM d, yyyy')} - {format(parseDateOnly(seasonData.config.endDate), 'MMMM d, yyyy')}
            </p>
          </div>

          <Separator />

          {/* Bill To */}
          <div>
            <h3 className="font-semibold mb-2">Bill To:</h3>
            <p>{familyGroup || 'All Family Groups'}</p>
            <p className="text-sm text-muted-foreground">Generated: {format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          {/* Stays Table */}
          <div>
            <h3 className="font-semibold mb-3">Reservation Details</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Dates</th>
                  <th className="text-center py-2">Nights</th>
                  <th className="text-right py-2">Charges</th>
                  <th className="text-right py-2">Paid</th>
                  <th className="text-right py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredStays.map((stay, index) => {
                  const balance = (stay.billing?.total || 0) - (stay.payment?.amount_paid || 0);
                  return (
                    <tr key={index} className="border-b">
                      <td className="py-2">
                        {format(parseDateOnly(stay.reservation.start_date), 'MMM d')} - {format(parseDateOnly(stay.reservation.end_date), 'MMM d')}
                      </td>
                      <td className="text-center">{stay.billing?.nights || 0}</td>
                      <td className="text-right">${(stay.billing?.total || 0).toFixed(2)}</td>
                      <td className="text-right">${(stay.payment?.amount_paid || 0).toFixed(2)}</td>
                      <td className="text-right">${balance.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span className="font-medium">Total Nights:</span>
              <span>{invoiceTotals.totalNights}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Charges:</span>
              <span>${invoiceTotals.totalCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Paid:</span>
              <span>${invoiceTotals.totalPaid.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Balance Due:</span>
              <span className={invoiceTotals.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}>
                ${invoiceTotals.balanceDue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Instructions */}
          {invoiceTotals.balanceDue > 0 && (
            <Alert>
              <AlertDescription>
                Please remit payment to the organization treasurer. Payment is due by {format(new Date(seasonData.config.paymentDeadline), 'MMMM d, yyyy')}.
              </AlertDescription>
            </Alert>
          )}
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
          <Button variant="outline" disabled>
            <Mail className="h-4 w-4 mr-2" />
            Email (Test Mode)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
