import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

interface WorkWeekendData {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  proposer_name: string;
  proposer_email: string;
  proposer_family_group?: string;
}

export const useWorkWeekends = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workWeekends, setWorkWeekends] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  const fetchWorkWeekends = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('work_weekends' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching work weekends:', error);
        return;
      }

      setWorkWeekends(data || []);
    } catch (error) {
      console.error('Error in fetchWorkWeekends:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    if (!organization?.id || !user?.email) return;

    try {
      // Get family group for current user
      const userFamilyGroup = familyGroups.find(fg => 
        fg.lead_email?.toLowerCase() === user.email?.toLowerCase() || 
        fg.host_members?.some((member: any) => member.email?.toLowerCase() === user.email?.toLowerCase())
      );

      if (!userFamilyGroup) return;

      const { data, error } = await supabase
        .from('work_weekend_approvals' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .eq('family_group', userFamilyGroup.name)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching pending approvals:', error);
        return;
      }

      setPendingApprovals(data || []);
    } catch (error) {
      console.error('Error in fetchPendingApprovals:', error);
    }
  };

  const detectConflictingReservations = async (startDate: string, endDate: string) => {
    if (!organization?.id) return [];

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id)
        .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

      if (error) {
        console.error('Error detecting conflicts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in detectConflictingReservations:', error);
      return [];
    }
  };

  const proposeWorkWeekend = async (workWeekendData: WorkWeekendData) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to propose a work weekend.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      // Detect conflicting reservations
      const conflicts = await detectConflictingReservations(
        workWeekendData.start_date, 
        workWeekendData.end_date
      );

      const dataToSave = {
        ...workWeekendData,
        organization_id: organization.id,
        proposer_user_id: user.id,
        conflict_reservations: conflicts,
      };

      const { data: newWorkWeekend, error } = await supabase
        .from('work_weekends' as any)
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error('Error proposing work weekend:', error);
        toast({
          title: "Error",
          description: "Failed to propose work weekend. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      // Create approval records for affected family groups
      if (conflicts.length > 0 && newWorkWeekend) {
        const approvalRecords = conflicts.reduce((acc: any[], reservation: any) => {
          if (!acc.find(a => a.family_group === reservation.family_group)) {
            acc.push({
              work_weekend_id: (newWorkWeekend as any).id,
              organization_id: organization.id,
              family_group: reservation.family_group,
              approval_type: 'group_lead',
            });
          }
          return acc;
        }, []);

        if (approvalRecords.length > 0) {
          await supabase
            .from('work_weekend_approvals' as any)
            .insert(approvalRecords);
        }
      }

      setWorkWeekends(prev => [...prev, newWorkWeekend]);
      toast({
        title: "Success",
        description: "Work weekend proposed successfully!",
      });

      return newWorkWeekend;
    } catch (error) {
      console.error('Error in proposeWorkWeekend:', error);
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

  const supervisorApprove = async (workWeekendId: string) => {
    if (!user || !organization?.id) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_weekends' as any)
        .update({
          status: 'supervisor_approved',
          supervisor_approved_at: new Date().toISOString(),
          supervisor_approved_by: user.email,
        })
        .eq('id', workWeekendId)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('Error approving work weekend:', error);
        toast({
          title: "Error",
          description: "Failed to approve work weekend.",
          variant: "destructive",
        });
        return null;
      }

      setWorkWeekends(prev => 
        prev.map(ww => ww.id === workWeekendId ? data : ww)
      );

      toast({
        title: "Success",
        description: "Work weekend approved by supervisor!",
      });

      return data;
    } catch (error) {
      console.error('Error in supervisorApprove:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const approveAsGroupLead = async (approvalId: string) => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_weekend_approvals' as any)
        .update({
          status: 'approved',
          approved_by_email: user.email,
          approved_by_name: user.user_metadata?.first_name || user.email,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) {
        console.error('Error approving as group lead:', error);
        toast({
          title: "Error",
          description: "Failed to approve work weekend.",
          variant: "destructive",
        });
        return null;
      }

      // Check if all required approvals are complete
      if (data && (data as any).work_weekend_id) {
        await checkForFullApproval((data as any).work_weekend_id);
      }

      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      
      toast({
        title: "Success",
        description: "Work weekend approved!",
      });

      return data;
    } catch (error) {
      console.error('Error in approveAsGroupLead:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkForFullApproval = async (workWeekendId: string) => {
    try {
      // Check if all required approvals are complete
      const { data: approvals, error } = await supabase
        .from('work_weekend_approvals' as any)
        .select('*')
        .eq('work_weekend_id', workWeekendId);

      if (error) return;

      const allApproved = approvals?.every((approval: any) => approval.status === 'approved');
      
      if (allApproved && approvals.length > 0) {
        // Mark work weekend as fully approved
        await supabase
          .from('work_weekends' as any)
          .update({
            status: 'fully_approved',
            fully_approved_at: new Date().toISOString(),
          })
          .eq('id', workWeekendId);

        // Send notifications to all family groups and hosts
        await sendWorkWeekendNotifications(workWeekendId);
      }
    } catch (error) {
      console.error('Error checking for full approval:', error);
    }
  };

  const sendWorkWeekendNotifications = async (workWeekendId: string) => {
    try {
      // Get work weekend details
      const { data: workWeekend } = await supabase
        .from('work_weekends' as any)
        .select('*')
        .eq('id', workWeekendId)
        .single();

      if (!workWeekend) return;

      // Send notification via existing edge function
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'work_weekend_approved',
          organization_id: organization?.id,
          work_weekend: workWeekend,
        }
      });
    } catch (error) {
      console.error('Error sending work weekend notifications:', error);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchWorkWeekends();
      fetchPendingApprovals();
    }
  }, [organization?.id, user?.email, familyGroups]);

  return {
    workWeekends,
    pendingApprovals,
    loading,
    proposeWorkWeekend,
    supervisorApprove,
    approveAsGroupLead,
    refetchWorkWeekends: fetchWorkWeekends,
    refetchPendingApprovals: fetchPendingApprovals,
  };
};