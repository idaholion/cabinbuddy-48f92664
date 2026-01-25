import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CBFaqItem {
  id: string;
  route_path: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CBFaqItemInput {
  route_path: string;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: boolean;
}

export function useCBFaqItems() {
  const [items, setItems] = useState<CBFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('cb_faq_items')
        .select('*')
        .order('route_path')
        .order('sort_order');
      
      if (fetchError) throw fetchError;
      
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching CB FAQ items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (input: CBFaqItemInput): Promise<CBFaqItem | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('cb_faq_items')
        .insert({
          route_path: input.route_path,
          question: input.question,
          answer: input.answer,
          sort_order: input.sort_order ?? 0,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      toast({
        title: 'FAQ item created',
        description: 'The new FAQ item has been added successfully.',
      });
      
      await fetchItems();
      return data;
    } catch (err) {
      console.error('Error creating CB FAQ item:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create item',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateItem = async (id: string, input: Partial<CBFaqItemInput>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('cb_faq_items')
        .update(input)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast({
        title: 'FAQ item updated',
        description: 'The FAQ item has been updated successfully.',
      });
      
      await fetchItems();
      return true;
    } catch (err) {
      console.error('Error updating CB FAQ item:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('cb_faq_items')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      toast({
        title: 'FAQ item deleted',
        description: 'The FAQ item has been removed.',
      });
      
      await fetchItems();
      return true;
    } catch (err) {
      console.error('Error deleting CB FAQ item:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleActive = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateItem(id, { is_active: isActive });
  };

  // Get items grouped by route
  const getItemsByRoute = useCallback(() => {
    const grouped: Record<string, CBFaqItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.route_path]) {
        grouped[item.route_path] = [];
      }
      grouped[item.route_path].push(item);
    });
    return grouped;
  }, [items]);

  // Get unique routes
  const getUniqueRoutes = useCallback(() => {
    return [...new Set(items.map(item => item.route_path))].sort();
  }, [items]);

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    toggleActive,
    getItemsByRoute,
    getUniqueRoutes,
  };
}
