import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useRole } from '@/contexts/RoleContext';
import { GroupMember, FamilyGroupData } from '@/types/group-member';

interface FamilyGroup extends FamilyGroupData {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export const useRoleAwareFamilyGroups = () => {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { canAccessSupervisorFeatures, isOrgAdmin } = useRole();

  const fetchFamilyGroups = useCallback(async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) {
        console.error('Error fetching family groups:', error);
        toast({
          title: "Error",
          description: "Failed to load family groups",
          variant: "destructive",
        });
        return;
      }

      // Parse host_members for each group
      const parsedGroups = (data || []).map(group => ({
        ...group,
        host_members: group.host_members ? 
          (Array.isArray(group.host_members) ? group.host_members : JSON.parse(group.host_members as any)) 
          : []
      }));

      // Remove duplicates by name (keeping the most recently updated)
      const uniqueGroups = parsedGroups.reduce((acc, group) => {
        const existingIndex = acc.findIndex(g => g.name === group.name);
        if (existingIndex >= 0) {
          // Replace if this group is newer
          if (new Date(group.updated_at) > new Date(acc[existingIndex].updated_at)) {
            acc[existingIndex] = group;
          }
        } else {
          acc.push(group);
        }
        return acc;
      }, [] as FamilyGroup[]);

      setFamilyGroups(uniqueGroups);
    } catch (error) {
      console.error('Error fetching family groups:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, toast]);

  const canManageGroup = useCallback((group: FamilyGroup, userEmail?: string) => {
    // Supervisors in supervisor mode can manage any group
    if (canAccessSupervisorFeatures) return true;
    
    // Organization admins can manage any group in their org
    if (isOrgAdmin) return true;
    
    // Group leads can manage their own group
    const normalize = (v?: string | null) => (v || '').toLowerCase().trim();
    if (userEmail && normalize(group.lead_email) === normalize(userEmail)) return true;

    // Alternate lead may be stored as an email OR as the member's name
    if (userEmail && group.alternate_lead_id) {
      const alt = normalize(group.alternate_lead_id);
      if (alt === normalize(userEmail)) return true;

      const members: any[] = Array.isArray(group.host_members) ? group.host_members : [];
      const me = members.find((m: any) => normalize(m?.email) === normalize(userEmail));
      if (me && normalize(me.name) === alt) return true;
    }
    
    return false;
  }, [canAccessSupervisorFeatures, isOrgAdmin]);

  const renameFamilyGroup = async (oldName: string, newName: string) => {
    if (!organization?.id) return { error: 'No organization selected' };

    try {
      const { data, error } = await supabase.rpc('rename_family_group', {
        p_organization_id: organization.id,
        p_old_name: oldName,
        p_new_name: newName
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to rename family group",
          variant: "destructive",
        });
        return { error: error.message };
      }

      toast({
        title: "Success",
        description: `Family group renamed from "${oldName}" to "${newName}"`,
      });

      await fetchFamilyGroups();
      return { data };
    } catch (error: any) {
      console.error('Error renaming family group:', error);
      const errorMessage = error?.message || 'Failed to rename family group';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const updateFamilyGroupColor = async (groupId: string, color: string) => {
    if (!organization?.id) return;

    try {
      const { error } = await supabase
        .from('family_groups')
        .update({ color, updated_at: new Date().toISOString() })
        .eq('id', groupId)
        .eq('organization_id', organization.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update group color",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setFamilyGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, color } : group
      ));

      toast({
        title: "Success",
        description: "Group color updated successfully",
      });
    } catch (error) {
      console.error('Error updating group color:', error);
      toast({
        title: "Error",
        description: "Failed to update group color",
        variant: "destructive",
      });
    }
  };

  const getAvailableColors = async (currentGroupId?: string) => {
    if (!organization?.id) return [];

    try {
      const { data, error } = await supabase.rpc('get_available_colors', {
        p_organization_id: organization.id,
        p_current_group_id: currentGroupId || null
      });

      if (error) {
        console.error('Error fetching available colors:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching available colors:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchFamilyGroups();
  }, [fetchFamilyGroups]);

  return {
    familyGroups,
    loading,
    canManageGroup,
    renameFamilyGroup,
    updateFamilyGroupColor,
    getAvailableColors,
    refetch: fetchFamilyGroups,
  };
};
