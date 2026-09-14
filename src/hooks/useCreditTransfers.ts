import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { secureSelect, secureInsert, createOrganizationContext } from '@/lib/secure-queries';

export interface CreditTransfer {
  id: string;
  organization_id: string;
  from_ledger_name: string;
  to_ledger_name: string;
  amount: number;
  transfer_date: string;
  notes?: string | null;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewCreditTransfer {
  from_ledger_name: string;
  to_ledger_name: string;
  amount: number;
  transfer_date: string;
  notes?: string;
}

export const useCreditTransfers = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<CreditTransfer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransfers = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureSelect('credit_transfers', orgContext)
        .order('transfer_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching credit transfers:', error);
        return;
      }

      setTransfers(data || []);
    } catch (error) {
      console.error('Error in fetchTransfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTransfer = async (transferData: NewCreditTransfer): Promise<CreditTransfer | null> => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to transfer credit.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureInsert('credit_transfers', {
        from_ledger_name: transferData.from_ledger_name,
        to_ledger_name: transferData.to_ledger_name,
        amount: transferData.amount,
        transfer_date: transferData.transfer_date,
        notes: transferData.notes,
        created_by_user_id: user.id,
      }, orgContext)
        .select()
        .single();

      if (error) {
        console.error('Error creating credit transfer:', error);
        toast({
          title: "Error",
          description: "Failed to record credit transfer. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      setTransfers(prev => [data, ...prev]);
      toast({
        title: "Credit transferred",
        description: "The credit transfer has been recorded successfully.",
      });
      return data;
    } catch (error) {
      console.error('Error in createTransfer:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchTransfers();
    }
  }, [organization?.id]);

  return {
    transfers,
    loading,
    createTransfer,
    refetchTransfers: fetchTransfers,
  };
};
