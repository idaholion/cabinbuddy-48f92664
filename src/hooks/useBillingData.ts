import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BillingUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  balance: number;
  status: 'current' | 'pending' | 'overdue';
  lastPayment?: string;
  familyGroup?: string;
}

interface BillingSummary {
  totalOutstanding: number;
  overdueUsers: number;
  currentUsers: number;
  pendingUsers: number;
  totalReceipts: number;
  monthlyTotal: number;
}

interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'completed';
  recipients: number;
  paid: number;
}

export const useBillingData = () => {
  const { user } = useAuth();

  // Fetch user organization
  const { data: userOrg } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      return profile?.organization_id || null;
    },
    enabled: !!user?.id,
  });

  // Fetch receipts data for billing calculations
  const { data: receipts, isLoading: receiptsLoading, error: receiptsError } = useQuery({
    queryKey: ['billing-receipts', userOrg],
    queryFn: async () => {
      if (!userOrg) return [];
      
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('organization_id', userOrg)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userOrg,
  });

  // Fetch family groups for user balances
  const { data: familyGroups, isLoading: familyGroupsLoading, error: familyGroupsError } = useQuery({
    queryKey: ['billing-family-groups', userOrg],
    queryFn: async () => {
      if (!userOrg) return [];
      
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .eq('organization_id', userOrg);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userOrg,
  });

  // Fetch organization details
  const { data: organization, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['organization', userOrg],
    queryFn: async () => {
      if (!userOrg) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userOrg)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userOrg,
  });

  // Process data for billing users
  const billingUsers: BillingUser[] = (familyGroups || []).map(group => {
    const groupReceipts = (receipts || []).filter(r => r.family_group === group.name);
    const totalSpent = groupReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
    
    // Calculate balance (simplified logic - in real app would be more complex)
    const monthlyShare = totalSpent / (familyGroups?.length || 1);
    const balance = monthlyShare - totalSpent;
    
    // Determine status based on balance and recent activity
    const lastReceipt = groupReceipts[0];
    const daysSinceLastPayment = lastReceipt ? 
      Math.floor((Date.now() - new Date(lastReceipt.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 
      999;
    
    let status: 'current' | 'pending' | 'overdue' = 'current';
    if (balance < -50) status = 'overdue';
    else if (balance < 0 || daysSinceLastPayment > 30) status = 'pending';

    return {
      id: group.id,
      name: group.lead_name || group.name,
      email: group.lead_email || `${group.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      avatar: group.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      balance: Math.round(balance),
      status,
      lastPayment: lastReceipt?.created_at ? new Date(lastReceipt.created_at).toISOString().split('T')[0] : undefined,
      familyGroup: group.name,
    };
  });

  // Calculate billing summary
  const billingSummary: BillingSummary = {
    totalOutstanding: billingUsers.reduce((sum, user) => sum + Math.abs(Math.min(0, user.balance)), 0),
    overdueUsers: billingUsers.filter(user => user.status === 'overdue').length,
    currentUsers: billingUsers.filter(user => user.status === 'current').length,
    pendingUsers: billingUsers.filter(user => user.status === 'pending').length,
    totalReceipts: receipts?.length || 0,
    monthlyTotal: (receipts || []).reduce((sum, receipt) => sum + Number(receipt.amount), 0),
  };

  // Generate bills based on recent receipts (simplified)
  const bills: Bill[] = [
    {
      id: 'current-month',
      description: `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Property Expenses`,
      amount: billingSummary.monthlyTotal,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: billingSummary.monthlyTotal > 0 ? 'draft' : 'completed',
      recipients: familyGroups?.length || 0,
      paid: billingUsers.filter(user => user.status === 'current').length,
    },
  ];

  const isLoading = receiptsLoading || familyGroupsLoading || orgLoading;
  const error = receiptsError || familyGroupsError || orgError;

  return {
    billingUsers,
    billingSummary,
    bills,
    organization,
    isLoading,
    error,
    refetch: () => {
      // Could add refetch logic here if needed
    },
  };
};