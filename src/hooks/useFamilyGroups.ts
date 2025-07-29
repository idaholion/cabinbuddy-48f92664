import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface HostMember {
  name: string;
  phone: string;
  email: string;
}

interface FamilyGroupData {
  name: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  host_members?: HostMember[];
  reservation_permission?: string;
  alternate_lead_id?: string;
}

export const useFamilyGroups = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [familyGroups, setFamilyGroups] = useState<any[]>([]);

  const fetchFamilyGroups = async () => {
    if (!user || !organization?.id) return;

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

  return {
    familyGroups,
    loading,
    createFamilyGroup,
    updateFamilyGroup,
    refetchFamilyGroups: fetchFamilyGroups,
  };
};