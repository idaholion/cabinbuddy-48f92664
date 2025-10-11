import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Eye, Download, DollarSign, Send, Mail } from 'lucide-react';
import { useInvoices, type InvoiceStatus } from '@/hooks/useInvoices';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { parseDateOnly } from '@/lib/date-utils';
import { InvoiceGenerator } from './InvoiceGenerator';
import { InvoiceViewer } from './InvoiceViewer';
import { RecordInvoicePaymentDialog } from './RecordInvoicePaymentDialog';

export const InvoicesList = () => {
  const { invoices, loading, createInvoice, sendInvoice, sendBatchInvoices } = useInvoices();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

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

  const handleSendInvoice = async (invoiceId: string) => {
    setIsSending(true);
    await sendInvoice(invoiceId);
    setIsSending(false);
  };

  const handleBatchSend = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setIsSending(true);
    await sendBatchInvoices(selectedInvoiceIds);
    setSelectedInvoiceIds([]);
    setIsSending(false);
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === eligibleInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(eligibleInvoices.map(inv => inv.id));
    }
  };

  // Filter invoices that can be sent (draft or sent status)
  const eligibleInvoices = invoices.filter(inv => 
    ['draft', 'sent'].includes(inv.status)
  );

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
            <div className="flex items-center gap-2">
              {selectedInvoiceIds.length > 0 && (
                <Button 
                  onClick={handleBatchSend}
                  disabled={isSending}
                  variant="secondary"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Selected ({selectedInvoiceIds.length})
                </Button>
              )}
              <Button onClick={() => setIsGeneratorOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eligibleInvoices.length > 0 && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <Checkbox
                checked={selectedInvoiceIds.length === eligibleInvoices.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all sendable invoices
              </span>
            </div>
          )}
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const canBeSent = ['draft', 'sent'].includes(invoice.status);
              return (
                <div key={invoice.id} className="flex items-center gap-3 p-4 border rounded-lg">
                  {canBeSent && (
                    <Checkbox
                      checked={selectedInvoiceIds.includes(invoice.id)}
                      onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{invoice.invoice_number}</span>
                      <Badge variant={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.family_group} • Due: {format(parseDateOnly(invoice.due_date), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Total: ${invoice.total_amount.toFixed(2)}</span>
                      <span>Paid: ${invoice.amount_paid.toFixed(2)}</span>
                      <span className="font-medium text-foreground">Balance: ${invoice.balance_due.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invoice.status === 'draft' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSendInvoice(invoice.id)}
                        disabled={isSending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    )}
                    {invoice.status === 'sent' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendInvoice(invoice.id)}
                        disabled={isSending}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Resend
                      </Button>
                    )}
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
              );
            })}
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
