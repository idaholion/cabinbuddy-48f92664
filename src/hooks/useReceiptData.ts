import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Database types
type DbReceipt = Database['public']['Tables']['receipts']['Row'];

export interface Receipt {
  id: string;
  organization_id: string;
  user_id?: string;
  family_group?: string;
  description: string;
  amount: number;
  date: string;
  image_url?: string;
}

// Type conversion helper
const mapDbReceiptToReceipt = (dbReceipt: DbReceipt): Receipt => ({
  id: dbReceipt.id,
  organization_id: dbReceipt.organization_id,
  user_id: dbReceipt.user_id || undefined,
  family_group: dbReceipt.family_group || undefined,
  description: dbReceipt.description,
  amount: Number(dbReceipt.amount),
  date: dbReceipt.date,
  image_url: dbReceipt.image_url || undefined
});

// Custom hook for receipts
export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      const mappedReceipts = (data || []).map(mapDbReceiptToReceipt);
      setReceipts(mappedReceipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReceipt = async (receiptData: Omit<Receipt, 'id' | 'organization_id'>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('receipts')
        .insert({
          ...receiptData,
          organization_id: profile.organization_id,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const mappedReceipt = mapDbReceiptToReceipt(data);
        setReceipts(prev => [mappedReceipt, ...prev]);
        toast({ title: "Receipt saved successfully!" });
        return mappedReceipt;
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast({ title: "Error saving receipt", variant: "destructive" });
    }
  };

  const updateReceipt = async (id: string, updates: Partial<Receipt>) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const mappedReceipt = mapDbReceiptToReceipt(data);
        setReceipts(prev => prev.map(receipt => receipt.id === id ? mappedReceipt : receipt));
        toast({ title: "Receipt updated successfully!" });
      }
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast({ title: "Error updating receipt", variant: "destructive" });
    }
  };

  const deleteReceipt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setReceipts(prev => prev.filter(receipt => receipt.id !== id));
      toast({ title: "Receipt deleted successfully!" });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({ title: "Error deleting receipt", variant: "destructive" });
    }
  };

  return {
    receipts,
    loading,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    refetch: fetchReceipts
  };
};