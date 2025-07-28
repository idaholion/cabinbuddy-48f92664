import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface TradeRequestData {
  target_family_group: string;
  requested_start_date: string;
  requested_end_date: string;
  offered_start_date?: string;
  offered_end_date?: string;
  request_type: 'request_only' | 'trade_offer';
  requester_message?: string;
}

interface TradeRequest {
  id: string;
  requester_family_group: string;
  target_family_group: string;
  requested_start_date: string;
  requested_end_date: string;
  offered_start_date?: string;
  offered_end_date?: string;
  request_type: string;
  status: string;
  requester_message?: string;
  approver_message?: string;
  created_at: string;
  updated_at: string;
}

export const useTradeRequests = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);

  const fetchTradeRequests = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trade_requests')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trade requests:', error);
        return;
      }

      setTradeRequests(data || []);
    } catch (error) {
      console.error('Error in fetchTradeRequests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTradeRequest = async (tradeData: TradeRequestData, requesterFamilyGroup: string) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to create a trade request.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...tradeData,
        organization_id: organization.id,
        requester_family_group: requesterFamilyGroup,
        requester_user_id: user.id,
      };

      const { data: newTradeRequest, error } = await supabase
        .from('trade_requests')
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error('Error creating trade request:', error);
        toast({
          title: "Error",
          description: "Failed to create trade request. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      setTradeRequests(prev => [newTradeRequest, ...prev]);
      toast({
        title: "Success",
        description: "Trade request created successfully!",
      });

      return newTradeRequest;
    } catch (error) {
      console.error('Error in createTradeRequest:', error);
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

  const updateTradeRequest = async (requestId: string, updates: { status: string; approver_message?: string }) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to update a trade request.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const updateData = {
        ...updates,
        approver_user_id: user.id,
        approved_at: updates.status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { data: updatedRequest, error } = await supabase
        .from('trade_requests')
        .update(updateData)
        .eq('id', requestId)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating trade request:', error);
        toast({
          title: "Error",
          description: "Failed to update trade request. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      setTradeRequests(prev => 
        prev.map(req => req.id === requestId ? updatedRequest : req)
      );
      
      toast({
        title: "Success",
        description: `Trade request ${updates.status} successfully!`,
      });

      return updatedRequest;
    } catch (error) {
      console.error('Error in updateTradeRequest:', error);
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
      fetchTradeRequests();
    }
  }, [organization?.id]);

  return {
    tradeRequests,
    loading,
    createTradeRequest,
    updateTradeRequest,
    refetchTradeRequests: fetchTradeRequests,
  };
};