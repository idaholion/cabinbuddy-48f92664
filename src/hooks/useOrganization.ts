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
      // Use the new multi-organization system - get primary organization
      const { data: primaryOrgId, error: primaryError } = await supabase
        .rpc('get_user_primary_organization_id');

      if (primaryError) {
        console.error('Error fetching primary organization:', primaryError);
        setLoading(false);
        return;
      }

      if (primaryOrgId) {
        // Fetch the organization details
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', primaryOrgId)
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

      // Add user as admin of the new organization
      const { error: membershipError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'admin',
          is_primary: true // Make this the primary organization
        });

      if (membershipError) {
        console.error('Error adding user to organization:', membershipError);
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