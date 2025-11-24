import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { secureSelect, secureInsert, secureUpdate, secureDelete, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

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
  const { activeOrganization } = useOrganizationContext();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(false);

  // Create organization context for secure queries
  const orgContext = activeOrganization ? createOrganizationContext(
    activeOrganization.organization_id,
    activeOrganization.is_test_organization,
    activeOrganization.allocation_model
  ) : null;

  const fetchCycles = async () => {
    if (!orgContext) return;

    setLoading(true);
    try {
      const { data, error } = await secureSelect('billing_cycles', orgContext)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }

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
    if (!orgContext || !user?.id) return null;

    try {
      const { data, error } = await secureInsert(
        'billing_cycles',
        {
          ...cycleData,
          created_by_user_id: user.id,
        },
        orgContext
      ).select().single();

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
    if (!orgContext) return false;

    try {
      const { error } = await secureUpdate('billing_cycles', updates, orgContext)
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
    if (!orgContext) return false;

    try {
      const { error } = await secureDelete('billing_cycles', orgContext)
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
  }, [activeOrganization?.organization_id]);

  return {
    cycles,
    loading,
    createCycle,
    updateCycle,
    deleteCycle,
    refetch: fetchCycles,
  };
};
