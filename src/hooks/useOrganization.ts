import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { apiCache, cacheKeys } from '@/lib/cache';

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

  const fetchUserOrganization = useCallback(async () => {
    if (!user) return;

    // Check cache first
    const cachedOrg = apiCache.get(cacheKeys.primaryOrganization(user.id));
    if (cachedOrg) {
      setOrganization(cachedOrg);
      return;
    }

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
        // Check if organization details are cached
        const cachedOrgDetails = apiCache.get(cacheKeys.organization(primaryOrgId));
        if (cachedOrgDetails) {
          setOrganization(cachedOrgDetails);
          // Cache as primary organization
          apiCache.set(cacheKeys.primaryOrganization(user.id), cachedOrgDetails);
          setLoading(false);
          return;
        }

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
          // Cache both the organization and as primary
          apiCache.set(cacheKeys.organization(primaryOrgId), org);
          apiCache.set(cacheKeys.primaryOrganization(user.id), org);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserOrganization:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

      // SECURITY FIX: Validate organization creator gets admin role only for their own organization  
      const { error: membershipError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'admin', // Admin role only when creating organization
          is_primary: true // Make this the primary organization
        });

      if (membershipError) {
        console.error('Error adding user to organization:', membershipError);
        // Still show success since org was created
      }

      setOrganization(newOrg);
      
      // Invalidate relevant caches
      apiCache.invalidateByPrefix(`user_organizations_${user.id}`);
      apiCache.invalidate(cacheKeys.primaryOrganization(user.id));
      apiCache.set(cacheKeys.organization(newOrg.id), newOrg);
      
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
      
      // Update cache
      apiCache.set(cacheKeys.organization(organization.id), updatedOrg);
      apiCache.set(cacheKeys.primaryOrganization(user.id), updatedOrg);
      
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