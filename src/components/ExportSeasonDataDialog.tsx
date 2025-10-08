import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateOnly, calculateNights } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';

interface ExportSeasonDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonYear?: number; // Optional for backward compatibility
  year?: number; // Alternative prop name
  seasonData?: {
    config: any;
    stays: any[];
    totals: any;
  } | null;
  isAdminView?: boolean;
}

export const ExportSeasonDataDialog = ({
  open,
  onOpenChange,
  seasonYear,
  year,
  seasonData,
  isAdminView = false
}: ExportSeasonDataDialogProps) => {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [includePayments, setIncludePayments] = useState(true);
  const [includeOccupancy, setIncludeOccupancy] = useState(true);
  const [includeBilling, setIncludeBilling] = useState(true);
  const [exporting, setExporting] = useState(false);

  const actualYear = year || seasonYear || new Date().getFullYear();

  if (!seasonData) return null;

  const generateCSV = () => {
    const headers = [
      'Family Group',
      'Check-In Date',
      'Check-Out Date',
      'Nights',
      'Status'
    ];

    if (includeBilling) {
      headers.push('Base Charge', 'Total Charges');
    }

    if (includePayments) {
      headers.push('Amount Paid', 'Balance Due', 'Payment Status');
    }

    if (includeOccupancy) {
      headers.push('Average Occupancy');
    }

    const rows = seasonData.stays.map(stay => {
      const row = [
        stay.reservation.family_group,
        format(parseDateOnly(stay.reservation.start_date), 'yyyy-MM-dd'),
        format(parseDateOnly(stay.reservation.end_date), 'yyyy-MM-dd'),
        calculateNights(stay.reservation.start_date, stay.reservation.end_date),
        stay.reservation.status || 'confirmed'
      ];

      if (includeBilling) {
        row.push(
          (stay.billing?.baseAmount || 0).toFixed(2),
          (stay.billing?.total || 0).toFixed(2)
        );
      }

      if (includePayments) {
        const amountPaid = stay.payment?.amount_paid || 0;
        const totalCharge = stay.billing?.total || 0;
        const balance = totalCharge - amountPaid;
        
        row.push(
          amountPaid.toFixed(2),
          balance.toFixed(2),
          stay.payment?.status || 'pending'
        );
      }

      if (includeOccupancy) {
        const avgOccupancy = stay.payment?.daily_occupancy 
          ? (stay.payment.daily_occupancy.reduce((sum: number, day: any) => sum + day.guests, 0) / stay.payment.daily_occupancy.length).toFixed(1)
          : 'N/A';
        row.push(avgOccupancy);
      }

      return row;
    });

    // Add totals row
    const totalsRow = ['TOTALS', '', '', seasonData.totals.totalNights.toString(), ''];
    
    if (includeBilling) {
      totalsRow.push('', seasonData.totals.totalCharged.toFixed(2));
    }
    
    if (includePayments) {
      totalsRow.push(
        seasonData.totals.totalPaid.toFixed(2),
        seasonData.totals.outstandingBalance.toFixed(2),
        ''
      );
    }

    if (includeOccupancy) {
      totalsRow.push((seasonData.totals.actualGuestsAvg || 0).toFixed(1));
    }

    rows.push(totalsRow);

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csvContent = generateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `season_${seasonYear}_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Season ${seasonYear} data has been exported to CSV.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to export season data. Please try again.',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Season {seasonYear} Data
          </DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Export complete season summary data for record-keeping and analysis.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'excel')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">
                  CSV (Comma-separated values)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" disabled />
                <Label htmlFor="excel" className="font-normal cursor-pointer text-muted-foreground">
                  Excel (.xlsx) - Coming Soon
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <Label>Include in Export</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="billing" 
                  checked={includeBilling}
                  onCheckedChange={(checked) => setIncludeBilling(checked as boolean)}
                />
                <Label htmlFor="billing" className="font-normal cursor-pointer">
                  Billing Details
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="payments" 
                  checked={includePayments}
                  onCheckedChange={(checked) => setIncludePayments(checked as boolean)}
                />
                <Label htmlFor="payments" className="font-normal cursor-pointer">
                  Payment Information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="occupancy" 
                  checked={includeOccupancy}
                  onCheckedChange={(checked) => setIncludeOccupancy(checked as boolean)}
                />
                <Label htmlFor="occupancy" className="font-normal cursor-pointer">
                  Occupancy Data
                </Label>
              </div>
            </div>
          </div>

          {/* Summary Info */}
          <Alert>
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                <p><strong>Records to export:</strong> {seasonData.stays.length} reservations</p>
                <p><strong>Date range:</strong> {format(new Date(seasonData.config.startDate), 'MMM d')} - {format(new Date(seasonData.config.endDate), 'MMM d, yyyy')}</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
