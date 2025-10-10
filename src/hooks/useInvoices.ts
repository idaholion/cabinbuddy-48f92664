import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

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
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
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
    if (!organization?.id) return null;

    try {
      const { data, error } = await supabase
        .rpc('get_next_invoice_number', { org_id: organization.id });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').substring(0, 14);
      return `CABINBUDDY-${timestamp}`;
    }
  };

  const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'created_by_user_id' | 'invoice_number'>) => {
    if (!organization?.id || !user?.id) return null;

    try {
      const invoiceNumber = await generateInvoiceNumber();
      if (!invoiceNumber) throw new Error('Failed to generate invoice number');

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          invoice_number: invoiceNumber,
          organization_id: organization.id,
          created_by_user_id: user.id,
        })
        .select()
        .single();

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

      const { error } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
          paid_at: newBalanceDue <= 0 ? new Date().toISOString() : null,
        })
        .eq('id', invoiceId);

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
    try {
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);

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
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
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

  useEffect(() => {
    fetchInvoices();
  }, [organization?.id]);

  return {
    invoices,
    loading,
    createInvoice,
    recordPayment,
    updateInvoice,
    deleteInvoice,
    refetch: fetchInvoices,
  };
};
