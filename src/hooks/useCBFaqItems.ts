import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface CreateCBFaqItemInput {
  route_path: string;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCBFaqItemInput {
  id: string;
  route_path?: string;
  question?: string;
  answer?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Route options for the dropdown - all routes that can have FAQ items
export const CB_FAQ_ROUTES = [
  { path: '/', label: 'Home (Landing)' },
  { path: '/home', label: 'Home Dashboard' },
  { path: '/calendar', label: 'Cabin Calendar' },
  { path: '/cabin-calendar', label: 'Cabin Calendar (Alt)' },
  { path: '/check-in', label: 'Check-In' },
  { path: '/checkout-list', label: 'Checkout List' },
  { path: '/checkout-final', label: 'Daily & Final Check' },
  { path: '/stay-history', label: 'Stay History' },
  { path: '/shopping-list', label: 'Shopping List' },
  { path: '/add-receipt', label: 'Add Receipt' },
  { path: '/documents', label: 'Documents' },
  { path: '/photos', label: 'Photos' },
  { path: '/shared-notes', label: 'Shared Notes' },
  { path: '/messaging', label: 'Messaging' },
  { path: '/family-voting', label: 'Family Voting' },
  { path: '/family-group-setup', label: 'Family Group Setup' },
  { path: '/family-setup', label: 'Family Setup' },
  { path: '/reservation-setup', label: 'Reservation Setup' },
  { path: '/use-fee-setup', label: 'Use Fee Setup' },
  { path: '/cabin-rules', label: 'Cabin Rules' },
  { path: '/seasonal-checklists', label: 'Seasonal Checklists' },
  { path: '/faq', label: 'FAQ Page' },
  { path: '/finance-reports', label: 'Financial Dashboard' },
  { path: '/billing', label: 'Billing & Invoices' },
  { path: '/invoice-settings', label: 'Invoice Settings' },
  { path: '/financial-admin-tools', label: 'Financial Admin Tools' },
  { path: '/calendar-keeper-management', label: 'Calendar Keeper' },
  { path: '/group-member-profile', label: 'Profile Settings' },
  { path: '/setup', label: 'Account Setup' },
  { path: '/features', label: 'Feature Guide' },
  { path: '/data-backup', label: 'Data Backup' },
] as const;

// Fetch all CB FAQ items (for supervisors)
export function useCBFaqItemsAll() {
  return useQuery({
    queryKey: ['cb-faq-items', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cb_faq_items')
        .select('*')
        .order('route_path')
        .order('sort_order');

      if (error) throw error;
      return data as CBFaqItem[];
    },
  });
}

// Fetch active CB FAQ items for a specific route (for CBHelpButton)
export function useCBFaqItemsByRoute(routePath: string) {
  return useQuery({
    queryKey: ['cb-faq-items', 'route', routePath],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cb_faq_items')
        .select('*')
        .eq('route_path', routePath)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as CBFaqItem[];
    },
    enabled: !!routePath,
  });
}

// CRUD operations hook for supervisors
export function useCBFaqItemsMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (input: CreateCBFaqItemInput) => {
      const { data, error } = await supabase
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

      if (error) throw error;
      return data as CBFaqItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cb-faq-items'] });
      toast({
        title: 'FAQ Created',
        description: 'The FAQ item has been created successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to create FAQ item:', error);
      toast({
        title: 'Error',
        description: 'Failed to create FAQ item. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateCBFaqItemInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('cb_faq_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CBFaqItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cb-faq-items'] });
      toast({
        title: 'FAQ Updated',
        description: 'The FAQ item has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to update FAQ item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update FAQ item. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cb_faq_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cb-faq-items'] });
      toast({
        title: 'FAQ Deleted',
        description: 'The FAQ item has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to delete FAQ item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete FAQ item. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('cb_faq_items')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CBFaqItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cb-faq-items'] });
      toast({
        title: data.is_active ? 'FAQ Activated' : 'FAQ Deactivated',
        description: `The FAQ item is now ${data.is_active ? 'visible' : 'hidden'}.`,
      });
    },
    onError: (error) => {
      console.error('Failed to toggle FAQ item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update FAQ item. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    createFaq: createMutation.mutateAsync,
    updateFaq: updateMutation.mutateAsync,
    deleteFaq: deleteMutation.mutateAsync,
    toggleFaqActive: toggleActiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleActiveMutation.isPending,
  };
}
