import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_code: string;
  role: string;
  is_primary: boolean;
  joined_at: string;
}

interface OrganizationData {
  name: string;
  code: string;
  admin_name?: string;
  admin_email?: string;
  admin_phone?: string;
  treasurer_name?: string;
  treasurer_email?: string;
  treasurer_phone?: string;
  calendar_keeper_name?: string;
  calendar_keeper_email?: string;
  calendar_keeper_phone?: string;
}

export const useMultiOrganization = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<UserOrganization | null>(null);

  const fetchUserOrganizations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_organizations');
      
      if (error) {
        console.error('Error fetching user organizations:', error);
        return;
      }

      setOrganizations(data || []);
      
      // Set primary organization as active, or first one if no primary
      const primary = data?.find(org => org.is_primary);
      const activeOrg = primary || data?.[0] || null;
      setActiveOrganization(activeOrg);
      
    } catch (error) {
      console.error('Error in fetchUserOrganizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchToOrganization = async (organizationId: string) => {
    const org = organizations.find(o => o.organization_id === organizationId);
    if (org) {
      setActiveOrganization(org);
      
      // Optionally set as primary organization
      try {
        await supabase.rpc('set_primary_organization', { org_id: organizationId });
        // Update local state to reflect primary change
        setOrganizations(orgs => 
          orgs.map(o => ({
            ...o,
            is_primary: o.organization_id === organizationId
          }))
        );
      } catch (error) {
        console.error('Error setting primary organization:', error);
      }
    }
  };

  const joinOrganization = async (organizationCode: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to join an organization.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      // First, find the organization by code
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, code')
        .eq('code', organizationCode.toUpperCase())
        .single();

      if (orgError || !org) {
        toast({
          title: "Error",
          description: "Organization not found with that code.",
          variant: "destructive",
        });
        return false;
      }

      // Check if user is already a member
      const existing = organizations.find(o => o.organization_id === org.id);
      if (existing) {
        toast({
          title: "Already a member",
          description: "You are already a member of this organization.",
          variant: "destructive",
        });
        return false;
      }

      // Add user to organization
      const { error: joinError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'member',
          is_primary: organizations.length === 0 // Make primary if it's their first org
        });

      if (joinError) {
        console.error('Error joining organization:', joinError);
        toast({
          title: "Error",
          description: "Failed to join organization. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Refresh organizations list
      await fetchUserOrganizations();
      
      toast({
        title: "Success",
        description: `Successfully joined ${org.name}!`,
      });

      return true;
    } catch (error) {
      console.error('Error in joinOrganization:', error);
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

  const createOrganization = async (orgData: OrganizationData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an organization.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      // Create the organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        toast({
          title: "Error",
          description: "Failed to create organization. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      // Add user as admin of the new organization
      const { error: joinError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'admin',
          is_primary: organizations.length === 0 // Make primary if it's their first org
        });

      if (joinError) {
        console.error('Error adding user to organization:', joinError);
        // Still show success since org was created
      }

      // Refresh organizations list
      await fetchUserOrganizations();
      
      toast({
        title: "Success",
        description: "Organization created successfully!",
      });

      return newOrg;
    } catch (error) {
      console.error('Error in createOrganization:', error);
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

  const leaveOrganization = async (organizationId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', user.id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error leaving organization:', error);
        toast({
          title: "Error",
          description: "Failed to leave organization. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Refresh organizations list
      await fetchUserOrganizations();
      
      toast({
        title: "Success",
        description: "Successfully left the organization.",
      });

      return true;
    } catch (error) {
      console.error('Error in leaveOrganization:', error);
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

  useEffect(() => {
    fetchUserOrganizations();
  }, [user]);

  return {
    organizations,
    activeOrganization,
    loading,
    switchToOrganization,
    joinOrganization,
    createOrganization,
    leaveOrganization,
    refetchOrganizations: fetchUserOrganizations,
  };
};