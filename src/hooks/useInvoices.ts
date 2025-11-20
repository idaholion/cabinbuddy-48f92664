import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from './useOrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { secureSelect, secureInsert, secureUpdate, secureDelete, secureRpc, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  organization_id: string;
  billing_cycle_id: string | null;
  invoice_number: string;
  family_group: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  line_items: any;
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
}

export const useInvoices = () => {
  const { user } = useAuth();
  const { activeOrganization, getOrganizationId } = useOrganizationContext();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  // Create organization context for secure queries
  const orgContext = activeOrganization ? createOrganizationContext(
    activeOrganization.organization_id,
    activeOrganization.is_test_organization,
    activeOrganization.allocation_model
  ) : null;

  const fetchInvoices = async () => {
    if (!orgContext) return;

    setLoading(true);
    try {
      const { data, error } = await secureSelect('invoices', orgContext)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }

      setInvoices((data || []) as Invoice[]);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load invoices',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = async () => {
    if (!orgContext) return null;

    try {
      const { data, error } = await secureRpc(
        'get_next_invoice_number',
        { org_id: getOrganizationId() },
        orgContext
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').substring(0, 14);
      return `CABINBUDDY-${timestamp}`;
    }
  };

  const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'created_by_user_id' | 'invoice_number'>) => {
    if (!orgContext || !user?.id) return null;

    try {
      const invoiceNumber = await generateInvoiceNumber();
      if (!invoiceNumber) throw new Error('Failed to generate invoice number');

      const { data, error } = await secureInsert(
        'invoices',
        {
          ...invoiceData,
          invoice_number: invoiceNumber,
          created_by_user_id: user.id,
        },
        orgContext
      ).select().single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });

      await fetchInvoices();
      return data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invoice',
      });
      return null;
    }
  };

  const recordPayment = async (invoiceId: string, amount: number, paymentMethod: string, reference?: string) => {
    if (!orgContext) return false;

    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const newAmountPaid = invoice.amount_paid + amount;
      const newBalanceDue = invoice.total_amount - newAmountPaid;
      
      let newStatus: InvoiceStatus = invoice.status;
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      const { error } = await secureUpdate(
        'invoices',
        {
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
          paid_at: newBalanceDue <= 0 ? new Date().toISOString() : null,
        },
        orgContext
      ).eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: 'Payment Recorded',
        description: `$${amount.toFixed(2)} payment recorded. ${newBalanceDue > 0 ? `Balance remaining: $${newBalanceDue.toFixed(2)}` : 'Invoice fully paid!'}`,
      });

      await fetchInvoices();
      return true;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to record payment',
      });
      return false;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    if (!orgContext) return false;

    try {
      const { error } = await secureUpdate(
        'invoices',
        updates,
        orgContext
      ).eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });

      await fetchInvoices();
      return true;
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update invoice',
      });
      return false;
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!orgContext) return false;

    try {
      const { error } = await secureDelete('invoices', orgContext)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });

      await fetchInvoices();
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invoice',
      });
      return false;
    }
  };

  const sendInvoice = async (invoiceId: string) => {
    if (!orgContext) return false;

    try {
      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: {
          invoice_id: invoiceId,
          organization_id: getOrganizationId(),
        },
      });

      if (error) throw error;

      toast({
        title: 'Invoice Sent',
        description: 'Invoice has been sent successfully via email',
      });

      await fetchInvoices();
      return true;
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send invoice',
      });
      return false;
    }
  };

  const sendBatchInvoices = async (invoiceIds: string[]) => {
    if (!orgContext || invoiceIds.length === 0) return { success: 0, failed: 0 };

    let successCount = 0;
    let failedCount = 0;

    for (const invoiceId of invoiceIds) {
      try {
        const { error } = await supabase.functions.invoke('send-invoice', {
          body: {
            invoice_id: invoiceId,
            organization_id: getOrganizationId(),
          },
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error('Error sending invoice:', invoiceId, error);
        failedCount++;
      }
    }

    toast({
      title: 'Batch Send Complete',
      description: `Successfully sent ${successCount} invoice(s). ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
      variant: failedCount > 0 ? 'destructive' : 'default',
    });

    await fetchInvoices();
    return { success: successCount, failed: failedCount };
  };

  useEffect(() => {
    if (orgContext) {
      fetchInvoices();
    }
  }, [activeOrganization?.organization_id]);

  return {
    invoices,
    loading,
    createInvoice,
    recordPayment,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    sendBatchInvoices,
    refetch: fetchInvoices,
  };
};
