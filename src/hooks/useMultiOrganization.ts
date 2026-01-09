import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { apiCache, cacheKeys } from '@/lib/cache';

interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_code: string;
  role: string;
  is_primary: boolean;
  joined_at: string;
  allocation_model?: string;
  is_test_organization?: boolean;
  use_virtual_weeks_system?: boolean;
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
  const [loading, setLoading] = useState(true); // Start with loading true to prevent premature redirects
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<UserOrganization | null>(null);

  const fetchUserOrganizations = useCallback(async () => {
    if (!user) return;

    // Clear cache first to ensure fresh data
    apiCache.invalidate(cacheKeys.userOrganizations(user.id));

    setLoading(true);
    try {
      // Direct query with explicit relationship specification
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          is_primary,
          joined_at,
          organizations!user_organizations_organization_id_fkey (
            name,
            code,
            allocation_model,
            is_test_organization
          )
        `)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user organizations:', error);
        return;
      }

      // Transform the data to match expected format
      const transformedData = data?.map(item => ({
        organization_id: item.organization_id,
        organization_name: (item.organizations as any).name || '',
        organization_code: (item.organizations as any).code || '',
        role: item.role,
        is_primary: item.is_primary,
        joined_at: item.joined_at,
        allocation_model: (item.organizations as any).allocation_model,
        is_test_organization: (item.organizations as any).is_test_organization,
        // Derive use_virtual_weeks_system from allocation_model for backwards compatibility
        use_virtual_weeks_system: (item.organizations as any).allocation_model === 'static_weeks'
      })) || [];

      setOrganizations(transformedData);
      
      // Cache the results
      apiCache.set(cacheKeys.userOrganizations(user.id), transformedData);
      
      // Auto-select: find primary org first, then fallback to first org if only one
      const primaryOrg = transformedData.find(o => o.is_primary);
      if (primaryOrg) {
        console.log('📍 Setting active organization to primary:', primaryOrg.organization_name);
        setActiveOrganization(primaryOrg);
      } else if (transformedData.length === 1) {
        console.log('📍 Setting active organization to only org:', transformedData[0].organization_name);
        setActiveOrganization(transformedData[0]);
      } else if (transformedData.length > 1) {
        // For 2+ orgs with no primary, select the first one as active
        console.log('📍 Setting active organization to first of multiple:', transformedData[0].organization_name);
        setActiveOrganization(transformedData[0]);
      } else {
        setActiveOrganization(null);
      }
      
    } catch (error) {
      console.error('Error in fetchUserOrganizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const switchToOrganization = async (organizationId: string) => {
    const org = organizations.find(o => o.organization_id === organizationId);
    if (org) {
      setActiveOrganization(org);
      
      // Optionally set as primary organization
      try {
        await supabase.rpc('set_primary_organization', { org_id: organizationId });
        // Update local state to reflect primary change
        const updatedOrgs = organizations.map(o => ({
          ...o,
          is_primary: o.organization_id === organizationId
        }));
        setOrganizations(updatedOrgs);
        
        // Update cache
        apiCache.set(cacheKeys.userOrganizations(user.id), updatedOrgs);
      } catch (error) {
        console.error('Error setting primary organization:', error);
      }
    }
  };

  const joinOrganization = async (organizationCode: string) => {
    if (!user) {
      console.error('❌ [JOIN ORG] No user found');
      toast({
        title: "Error",
        description: "You must be logged in to join an organization.",
        variant: "destructive",
      });
      return false;
    }

    console.log('🔍 [JOIN ORG] Starting join process for code:', organizationCode);
    console.log('🔍 [JOIN ORG] Current user details:', {
      id: user.id,
      email: user.email,
      userMetadata: user.user_metadata
    });
    setLoading(true);
    
    try {
      // First, find the organization by code
      console.log('🔍 [JOIN ORG] Looking up organization by code...');
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, code')
        .eq('code', organizationCode.toUpperCase())
        .single();

      if (orgError || !org) {
        console.error('❌ [JOIN ORG] Organization not found:', orgError);
        toast({
          title: "Error",
          description: "Organization not found with that code.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [JOIN ORG] Found organization:', org.name);

      // Check if user is already a member
      const existing = organizations.find(o => o.organization_id === org.id);
      if (existing) {
        console.log('⚠️ [JOIN ORG] User already a member');
        toast({
          title: "Already a member",
          description: "You are already a member of this organization.",
          variant: "destructive",
        });
        return false;
      }

      // SECURITY FIX: Validate role assignment - only allow 'member' for joining organizations
      console.log('🔍 [JOIN ORG] Adding user to organization...');
      const { error: joinError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'member', // FIXED: Always member role when joining
          is_primary: organizations.length === 0 // Make primary if it's their first org
        });

      if (joinError) {
        console.error('❌ [JOIN ORG] Database error:', joinError);
        toast({
          title: "Error",
          description: "Failed to join organization. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [JOIN ORG] Successfully added to organization');

      // Invalidate cache and refresh organizations list
      apiCache.invalidate(cacheKeys.userOrganizations(user.id));
      await fetchUserOrganizations();
      
      console.log('✅ [JOIN ORG] Organization list refreshed');
      
      toast({
        title: "Success", 
        description: `Successfully joined ${org.name}!`,
      });

      return true;
    } catch (error) {
      console.error('❌ [JOIN ORG] Exception:', error);
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

      // SECURITY FIX: Validate organization creator gets admin role only for their own organization
      const { error: joinError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'admin', // Admin role only when creating organization
          is_primary: organizations.length === 0 // Make primary if it's their first org
        });

      if (joinError) {
        console.error('Error adding user to organization:', joinError);
        // Still show success since org was created
      }

      // Invalidate cache and refresh organizations list
      apiCache.invalidate(cacheKeys.userOrganizations(user.id));
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

      // Invalidate cache and refresh organizations list
      apiCache.invalidate(cacheKeys.userOrganizations(user.id));
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