import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

export type BillingCycleType = 'monthly' | 'end_of_season' | 'end_of_year' | 'custom';
export type BillingCycleStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface BillingCycle {
  id: string;
  organization_id: string;
  cycle_name: string;
  cycle_type: BillingCycleType;
  start_date: string;
  end_date: string;
  payment_deadline: string;
  status: BillingCycleStatus;
  auto_send_invoices: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
}

export const useBillingCycles = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCycles = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('billing_cycles')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (error) {
      console.error('Error fetching billing cycles:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load billing cycles',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCycle = async (cycleData: Omit<BillingCycle, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'created_by_user_id'>) => {
    if (!organization?.id || !user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('billing_cycles')
        .insert({
          ...cycleData,
          organization_id: organization.id,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Billing cycle created successfully',
      });

      await fetchCycles();
      return data;
    } catch (error) {
      console.error('Error creating billing cycle:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create billing cycle',
      });
      return null;
    }
  };

  const updateCycle = async (id: string, updates: Partial<BillingCycle>) => {
    try {
      const { error } = await supabase
        .from('billing_cycles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Billing cycle updated successfully',
      });

      await fetchCycles();
      return true;
    } catch (error) {
      console.error('Error updating billing cycle:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update billing cycle',
      });
      return false;
    }
  };

  const deleteCycle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('billing_cycles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Billing cycle deleted successfully',
      });

      await fetchCycles();
      return true;
    } catch (error) {
      console.error('Error deleting billing cycle:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete billing cycle',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCycles();
  }, [organization?.id]);

  return {
    cycles,
    loading,
    createCycle,
    updateCycle,
    deleteCycle,
    refetch: fetchCycles,
  };
};
