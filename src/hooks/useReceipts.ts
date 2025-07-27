import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface ReceiptData {
  description: string;
  amount: number;
  date: string;
  family_group?: string;
  image_url?: string;
}

export const useReceipts = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);

  const fetchReceipts = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        return;
      }

      setReceipts(data || []);
    } catch (error) {
      console.error('Error in fetchReceipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReceipt = async (receiptData: ReceiptData) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to create a receipt.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const { data: newReceipt, error } = await supabase
        .from('receipts')
        .insert({
          ...receiptData,
          organization_id: organization.id,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating receipt:', error);
        toast({
          title: "Error",
          description: "Failed to create receipt. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      setReceipts(prev => [newReceipt, ...prev]);
      
      toast({
        title: "Success",
        description: "Receipt created successfully!",
      });

      return newReceipt;
    } catch (error) {
      console.error('Error in createReceipt:', error);
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

  const deleteReceipt = async (receiptId: string) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "No organization found.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error deleting receipt:', error);
        toast({
          title: "Error",
          description: "Failed to delete receipt. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
      
      toast({
        title: "Success",
        description: "Receipt deleted successfully!",
      });
    } catch (error) {
      console.error('Error in deleteReceipt:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchReceipts();
    }
  }, [organization?.id]);

  return {
    receipts,
    loading,
    createReceipt,
    deleteReceipt,
    refetchReceipts: fetchReceipts,
  };
};