import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { secureSelect, secureInsert, secureUpdate, secureDelete, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

export interface ShoppingList {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  organization_id: string;
  item_name: string;
  quantity?: string;
  category?: string;
  is_completed: boolean;
  added_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export const useShoppingLists = () => {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchShoppingLists = async () => {
    if (!organization?.id) return;
    
    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureSelect('shopping_lists', orgContext)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }
      
      setShoppingLists(data || []);
    } catch (error) {
      console.error('Error fetching shopping lists:', error);
      toast({
        title: "Error",
        description: "Failed to load shopping lists",
        variant: "destructive"
      });
    }
  };

  const fetchItems = async (shoppingListId?: string) => {
    if (!organization?.id) return;
    
    try {
      const orgContext = createOrganizationContext(organization.id);
      let query = secureSelect('shopping_list_items', orgContext)
        .select('*');

      if (shoppingListId) {
        query = query.eq('shopping_list_id', shoppingListId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }
      
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching shopping list items:', error);
      toast({
        title: "Error",
        description: "Failed to load shopping list items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createShoppingList = async (title: string = 'Shopping List') => {
    if (!user || !organization?.id) return;

    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureInsert('shopping_lists', {
        user_id: user.id,
        title
      }, orgContext)
        .select()
        .single();

      if (error) throw error;

      setShoppingLists(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Shopping list created successfully"
      });

      return data;
    } catch (error) {
      console.error('Error creating shopping list:', error);
      toast({
        title: "Error",
        description: "Failed to create shopping list",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addItem = async (shoppingListId: string, itemData: {
    item_name: string;
    quantity?: string;
    category?: string;
  }) => {
    if (!user || !organization?.id) return;

    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureInsert('shopping_list_items', {
        shopping_list_id: shoppingListId,
        added_by_user_id: user.id,
        ...itemData
      }, orgContext)
        .select()
        .single();

      if (error) throw error;

      setItems(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Item added successfully"
      });

      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
      throw error;
    }
  };

  const toggleItemComplete = async (itemId: string) => {
    if (!organization?.id) return;

    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const orgContext = createOrganizationContext(organization.id);
      const { error } = await secureUpdate('shopping_list_items', {
        is_completed: !item.is_completed
      }, orgContext)
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.map(i => 
        i.id === itemId 
          ? { ...i, is_completed: !i.is_completed }
          : i
      ));
    } catch (error) {
      console.error('Error toggling item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!organization?.id) return;

    try {
      const orgContext = createOrganizationContext(organization.id);
      const { error } = await secureDelete('shopping_list_items', orgContext)
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(i => i.id !== itemId));
      toast({
        title: "Success",
        description: "Item deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const deleteShoppingList = async (listId: string) => {
    if (!organization?.id) return;

    try {
      const orgContext = createOrganizationContext(organization.id);
      const { error } = await secureDelete('shopping_lists', orgContext)
        .eq('id', listId);

      if (error) throw error;

      setShoppingLists(prev => prev.filter(l => l.id !== listId));
      setItems(prev => prev.filter(i => i.shopping_list_id !== listId));
      toast({
        title: "Success",
        description: "Shopping list deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      toast({
        title: "Error",
        description: "Failed to delete shopping list",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchShoppingLists();
      fetchItems();
    }
  }, [organization?.id]);

  return {
    shoppingLists,
    items,
    loading,
    createShoppingList,
    addItem,
    toggleItemComplete,
    deleteItem,
    deleteShoppingList,
    refetch: () => {
      fetchShoppingLists();
      fetchItems();
    }
  };
};