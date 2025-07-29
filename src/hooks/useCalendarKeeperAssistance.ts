import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export interface CalendarKeeperRequest {
  id: string;
  organization_id: string;
  requester_family_group: string;
  requester_user_id?: string;
  requester_email: string;
  requester_name: string;
  subject: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  category: 'general' | 'booking' | 'technical' | 'payment' | 'emergency';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  calendar_keeper_response?: string;
  responded_by?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export const useCalendarKeeperAssistance = () => {
  const [requests, setRequests] = useState<CalendarKeeperRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const fetchRequests = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_keeper_requests')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as CalendarKeeperRequest[]);
    } catch (error) {
      console.error('Error fetching calendar keeper requests:', error);
      toast({
        title: "Error",
        description: "Failed to load assistance requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: {
    subject: string;
    description: string;
    urgency: 'low' | 'medium' | 'high';
    category: 'general' | 'booking' | 'technical' | 'payment' | 'emergency';
  }) => {
    if (!organization?.id || !user) return false;

    // Get user's family group
    const userFamilyGroup = familyGroups.find(fg => 
      fg.host_members?.some((member: any) => member.email === user.email)
    );

    if (!userFamilyGroup) {
      toast({
        title: "Error",
        description: "Could not find your family group",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_keeper_requests')
        .insert({
          organization_id: organization.id,
          requester_family_group: userFamilyGroup.name,
          requester_user_id: user.id,
          requester_email: user.email || '',
          requester_name: user.user_metadata?.display_name || user.email || '',
          subject: requestData.subject,
          description: requestData.description,
          urgency: requestData.urgency,
          category: requestData.category,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to calendar keeper
      if (organization.calendar_keeper_email) {
        await sendNotification('assistance_request', {
          id: data.id,
          family_group_name: userFamilyGroup.name,
          check_in_date: '', // Not applicable for assistance requests
          check_out_date: '', // Not applicable for assistance requests
          guest_email: organization.calendar_keeper_email,
          guest_name: organization.calendar_keeper_name || 'Calendar Keeper',
        });
      }

      toast({
        title: "Request Sent",
        description: "Your assistance request has been sent to the calendar keeper",
      });

      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error creating assistance request:', error);
      toast({
        title: "Error",
        description: "Failed to create assistance request",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: CalendarKeeperRequest['status'], response?: string) => {
    setLoading(true);
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (response) {
        updateData.calendar_keeper_response = response;
        updateData.responded_by = user?.email || '';
        updateData.responded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('calendar_keeper_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Updated",
        description: `Request status updated to ${status}`,
      });

      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [organization?.id]);

  return {
    requests,
    loading,
    createRequest,
    updateRequestStatus,
    refetchRequests: fetchRequests,
  };
};
