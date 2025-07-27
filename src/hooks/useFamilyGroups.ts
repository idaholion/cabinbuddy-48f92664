import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface FamilyGroupData {
  name: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  host_members?: string[];
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

      setFamilyGroups(data || []);
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
          organization_id: organization.id
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

      setFamilyGroups(prev => [...prev, newGroup]);
      
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
      const { data: updatedGroup, error } = await supabase
        .from('family_groups')
        .update(updates)
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

      setFamilyGroups(prev => 
        prev.map(group => group.id === groupId ? updatedGroup : group)
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