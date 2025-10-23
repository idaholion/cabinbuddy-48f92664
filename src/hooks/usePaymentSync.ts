import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  success: boolean;
  created: number;
  existing: number;
  total: number;
  errors?: string[];
}

export const usePaymentSync = () => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const syncPayments = async (organizationId: string, year: number): Promise<SyncResult | null> => {
    setSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-organization-payments', {
        body: { organizationId, year }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Sync Complete",
          description: `Created ${data.created} new payment records from ${data.total} reservations.`,
        });
      }

      return data;
    } catch (error) {
      console.error('Payment sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Failed to sync payments',
        variant: "destructive",
      });
      return null;
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncing,
    syncPayments,
  };
};
