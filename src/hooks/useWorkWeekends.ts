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
  invitation_message?: string;
  invite_family_leads?: boolean;
  invite_all_members?: boolean;
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

      // Determine initial status based on conflicts
      const initialStatus = conflicts.length === 0 ? 'fully_approved' : 'proposed';
      
      const dataToSave = {
        ...workWeekendData,
        organization_id: organization.id,
        proposer_user_id: user.id,
        conflict_reservations: conflicts,
        status: initialStatus,
        ...(initialStatus === 'fully_approved' && { fully_approved_at: new Date().toISOString() })
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

      // Only create approval records if there are conflicts
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
      
      const successMessage = conflicts.length === 0 
        ? "Work weekend approved and added to calendar!" 
        : "Work weekend proposed - awaiting family group approvals.";
        
      toast({
        title: "Success",
        description: successMessage,
      });

      // If immediately approved, send notifications
      if (initialStatus === 'fully_approved') {
        await sendWorkWeekendNotifications((newWorkWeekend as any).id, 'work_weekend_approved');
      }

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
        await sendWorkWeekendNotifications(workWeekendId, 'work_weekend_approved');
      }
    } catch (error) {
      console.error('Error checking for full approval:', error);
    }
  };

  const sendWorkWeekendNotifications = async (
    workWeekendId: string, 
    notificationType: 'work_weekend_proposed' | 'work_weekend_invitation' | 'work_weekend_approved',
    targetFamilyGroups?: string[]
  ) => {
    try {
      if (!organization?.id) return;

      // Get the work weekend details
      const { data: workWeekend, error: weekendError } = await supabase
        .from('work_weekends')
        .select('*')
        .eq('id', workWeekendId)
        .single();

      if (weekendError || !workWeekend) {
        console.error('Error fetching work weekend:', weekendError);
        return;
      }

      // Get family groups to notify
      let familyGroupsToNotify: string[] = [];

      if (targetFamilyGroups) {
        // Specific family groups (for approval notifications)
        familyGroupsToNotify = targetFamilyGroups;
      } else if (workWeekend.invited_all_members) {
        // All family groups
        const { data: allGroups } = await supabase
          .from('family_groups')
          .select('name')
          .eq('organization_id', organization.id);
        familyGroupsToNotify = allGroups?.map(g => g.name) || [];
      } else if (workWeekend.invited_family_leads || notificationType === 'work_weekend_approved') {
        // Just family leads
        const { data: leadGroups } = await supabase
          .from('family_groups')
          .select('name')
          .eq('organization_id', organization.id)
          .not('lead_email', 'is', null);
        familyGroupsToNotify = leadGroups?.map(g => g.name) || [];
      }

      // Send notifications to each family group
      for (const familyGroupName of familyGroupsToNotify) {
        const { data: familyGroup } = await supabase
          .from('family_groups')
          .select('lead_name, lead_email, lead_phone')
          .eq('organization_id', organization.id)
          .eq('name', familyGroupName)
          .single();

        if (familyGroup?.lead_email) {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: notificationType,
              organization_id: organization.id,
              work_weekend_data: {
                id: workWeekend.id,
                title: workWeekend.title,
                description: workWeekend.description,
                start_date: workWeekend.start_date,
                end_date: workWeekend.end_date,
                proposer_name: workWeekend.proposer_name,
                proposer_family_group: workWeekend.proposer_family_group,
                invitation_message: workWeekend.invitation_message,
                recipient_name: familyGroup.lead_name || 'Family Lead',
                recipient_email: familyGroup.lead_email,
                recipient_family_group: familyGroupName,
              }
            }
          });
        }
      }

      console.log(`Sent ${notificationType} notifications for work weekend:`, workWeekendId);
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
    approveAsGroupLead,
    refetchWorkWeekends: fetchWorkWeekends,
    refetchPendingApprovals: fetchPendingApprovals,
  };
};