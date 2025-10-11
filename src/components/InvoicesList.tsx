import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Download, DollarSign } from 'lucide-react';
import { useInvoices, type InvoiceStatus } from '@/hooks/useInvoices';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { InvoiceGenerator } from './InvoiceGenerator';
import { InvoiceViewer } from './InvoiceViewer';
import { RecordInvoicePaymentDialog } from './RecordInvoicePaymentDialog';

export const InvoicesList = () => {
  const { invoices, loading, createInvoice } = useInvoices();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partial': return 'secondary';
      case 'overdue': return 'destructive';
      case 'sent': return 'outline';
      default: return 'outline';
    }
  };

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsViewerOpen(true);
  };

  const handleRecordPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoices
              </CardTitle>
              <CardDescription>Manage and track all invoices</CardDescription>
            </div>
            <Button onClick={() => setIsGeneratorOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{invoice.invoice_number}</span>
                    <Badge variant={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {invoice.family_group} • Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Total: ${invoice.total_amount.toFixed(2)}</span>
                    <span>Paid: ${invoice.amount_paid.toFixed(2)}</span>
                    <span className="font-medium text-foreground">Balance: ${invoice.balance_due.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewInvoice(invoice)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {invoice.balance_due > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRecordPayment(invoice)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Record Payment
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No invoices yet. Create your first invoice to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <InvoiceGenerator
        open={isGeneratorOpen}
        onOpenChange={setIsGeneratorOpen}
        onSave={async (invoiceData) => {
          await createInvoice(invoiceData);
        }}
      />

      <InvoiceViewer
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        invoice={selectedInvoice}
      />

      <RecordInvoicePaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        invoice={selectedInvoice}
      />
    </>
  );
};
