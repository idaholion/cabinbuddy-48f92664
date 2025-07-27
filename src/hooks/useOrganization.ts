import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const useOrganization = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);

  const fetchUserOrganization = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First get user's profile to see their organization_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profile?.organization_id) {
        // Fetch the organization details
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

        if (orgError && orgError.code !== 'PGRST116') {
          console.error('Error fetching organization:', orgError);
        } else {
          setOrganization(org);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserOrganization:', error);
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

      // Update user's profile to link to this organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: newOrg.id })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Still show success since org was created
      }

      setOrganization(newOrg);
      
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

  const updateOrganization = async (updates: Partial<OrganizationData>) => {
    if (!user || !organization) {
      toast({
        title: "Error",
        description: "No organization to update.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: updatedOrg, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating organization:', error);
        toast({
          title: "Error",
          description: "Failed to update organization. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setOrganization(updatedOrg);
      
      toast({
        title: "Success",
        description: "Organization updated successfully!",
      });
    } catch (error) {
      console.error('Error in updateOrganization:', error);
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
    fetchUserOrganization();
  }, [user]);

  return {
    organization,
    loading,
    createOrganization,
    updateOrganization,
    refetchOrganization: fetchUserOrganization,
  };
};