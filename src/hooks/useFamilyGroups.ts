import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useSupervisor } from '@/hooks/useSupervisor';

interface HostMember {
  name: string;
  phone: string;
  email: string;
  canReserve?: boolean;
}

interface FamilyGroupData {
  name: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  host_members?: HostMember[];
  color?: string;
  alternate_lead_id?: string;
}

export const useFamilyGroups = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { isSupervisor } = useSupervisor();
  const [loading, setLoading] = useState(false);
  const [familyGroups, setFamilyGroups] = useState<any[]>([]);

  const fetchFamilyGroups = async () => {
    if (!user || !organization?.id) {
      console.warn('fetchFamilyGroups called without user or organization:', { user: !!user, organization: !!organization });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) {
        console.error('Error fetching family groups:', error);
        return;
      }

      // Parse the JSONB host_members field
      const parsedData = (data || []).map(group => ({
        ...group,
        host_members: Array.isArray(group.host_members) ? (group.host_members as unknown as HostMember[]) : []
      }));
      
      setFamilyGroups(parsedData);
    } catch (error) {
      console.error('Error in fetchFamilyGroups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFamilyGroup = async (groupData: FamilyGroupData) => {
    if (!user || !organization?.id) {
      console.warn('createFamilyGroup called without user or organization:', { user: !!user, organization: !!organization });
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to create a family group.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const { data: newGroup, error } = await supabase
        .from('family_groups')
        .insert({
          ...groupData,
          organization_id: organization.id,
          host_members: groupData.host_members as any // Cast to any for JSONB
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating family group:', error);
        toast({
          title: "Error",
          description: "Failed to create family group. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      // Parse the new group data
      const parsedNewGroup = {
        ...newGroup,
        host_members: Array.isArray(newGroup.host_members) ? (newGroup.host_members as unknown as HostMember[]) : []
      };
      
      setFamilyGroups(prev => [...prev, parsedNewGroup]);
      
      toast({
        title: "Success",
        description: "Family group created successfully!",
      });

      return newGroup;
    } catch (error) {
      console.error('Error in createFamilyGroup:', error);
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

  const updateFamilyGroup = async (groupId: string, updates: Partial<FamilyGroupData>) => {
    if (!user || !organization?.id) {
      console.warn('updateFamilyGroup called without user or organization:', { user: !!user, organization: !!organization });
      toast({
        title: "Error",
        description: "No organization found.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare updates with proper JSONB casting
      const updatesWithJsonb = {
        ...updates,
        host_members: updates.host_members ? (updates.host_members as any) : undefined
      };

      const { data: updatedGroup, error } = await supabase
        .from('family_groups')
        .update(updatesWithJsonb)
        .eq('id', groupId)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating family group:', error);
        toast({
          title: "Error",
          description: "Failed to update family group. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Parse the updated group data
      const parsedUpdatedGroup = {
        ...updatedGroup,
        host_members: Array.isArray(updatedGroup.host_members) ? (updatedGroup.host_members as unknown as HostMember[]) : []
      };
      
      setFamilyGroups(prev => 
        prev.map(group => group.id === groupId ? parsedUpdatedGroup : group)
      );
      
      toast({
        title: "Success",
        description: "Family group updated successfully!",
      });
    } catch (error) {
      console.error('Error in updateFamilyGroup:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchFamilyGroups();
    }
  }, [organization?.id]);

  const renameFamilyGroup = async (oldName: string, newName: string) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "No organization found.",
        variant: "destructive",
      });
      return;
    }

    if (oldName === newName) {
      return; // No change needed
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rename_family_group', {
        p_organization_id: organization.id,
        p_old_name: oldName,
        p_new_name: newName
      });

      if (error) {
        console.error('Error renaming family group:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to rename family group. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Refresh the family groups list
      await fetchFamilyGroups();
      
      toast({
        title: "Success",
        description: `Family group renamed from "${oldName}" to "${newName}" successfully!`,
      });

    } catch (error) {
      console.error('Error in renameFamilyGroup:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while renaming the family group.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        console.error('Error getting available colors:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAvailableColors:', error);
      return [];
    }
  };

  const updateFamilyGroupColor = async (groupId: string, color: string) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "No organization found.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const { data: updatedGroup, error } = await supabase
        .from('family_groups')
        .update({ color })
        .eq('id', groupId)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating family group color:', error);
        toast({
          title: "Error",
          description: "Failed to update family group color. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Parse the updated group data
      const parsedUpdatedGroup = {
        ...updatedGroup,
        host_members: Array.isArray(updatedGroup.host_members) ? (updatedGroup.host_members as unknown as HostMember[]) : []
      };
      
      setFamilyGroups(prev => 
        prev.map(group => group.id === groupId ? parsedUpdatedGroup : group)
      );
      
      toast({
        title: "Success",
        description: "Family group color updated successfully!",
      });
      
      return true;
    } catch (error) {
      console.error('Error in updateFamilyGroupColor:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const assignDefaultColorsWithProtection = async () => {
    if (!isSupervisor) {
      toast({
        title: "Access Denied",
        description: "Only supervisors can assign default colors to all family groups.",
        variant: "destructive",
      });
      return false;
    }

    if (!organization?.id) {
      toast({
        title: "Error",
        description: "No organization found.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('assign_default_colors');
      
      if (error) {
        console.error('Error assigning default colors:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to assign default colors. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Refresh the family groups list to show the new colors
      await fetchFamilyGroups();
      
      toast({
        title: "Success",
        description: "Default colors assigned to family groups successfully!",
      });
      
      return true;
    } catch (error) {
      console.error('Error in assignDefaultColorsWithProtection:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while assigning colors.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    familyGroups,
    loading,
    createFamilyGroup,
    updateFamilyGroup,
    renameFamilyGroup,
    refetchFamilyGroups: fetchFamilyGroups,
    getAvailableColors,
    updateFamilyGroupColor,
    assignDefaultColorsWithProtection,
    isSupervisor,
  };
};