import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGuestAccessManagement = () => {
  const [loading, setLoading] = useState(false);

  const generateGuestToken = async (organizationId: string, expiresHours: number = 168) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_guest_access_token', {
        org_id: organizationId,
        expires_hours: expiresHours
      });

      if (error) {
        console.error('Error generating guest token:', error);
        toast.error('Failed to generate guest access link');
        return null;
      }

      toast.success('Guest access link generated successfully');
      return data;
    } catch (error) {
      console.error('Error generating guest token:', error);
      toast.error('Failed to generate guest access link');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const revokeGuestAccess = async (organizationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('revoke_guest_access', {
        org_id: organizationId
      });

      if (error) {
        console.error('Error revoking guest access:', error);
        toast.error('Failed to revoke guest access');
        return false;
      }

      toast.success('Guest access revoked successfully');
      return true;
    } catch (error) {
      console.error('Error revoking guest access:', error);
      toast.error('Failed to revoke guest access');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateOrganizationAccessType = async (organizationId: string, accessType: 'private' | 'public_readonly' | 'demo') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ access_type: accessType })
        .eq('id', organizationId);

      if (error) {
        console.error('Error updating organization access type:', error);
        toast.error('Failed to update organization access type');
        return false;
      }

      toast.success(`Organization access type updated to ${accessType}`);
      return true;
    } catch (error) {
      console.error('Error updating organization access type:', error);
      toast.error('Failed to update organization access type');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getGuestAccessUrl = (organizationId: string, token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/guest?org=${organizationId}&token=${token}`;
  };

  return {
    generateGuestToken,
    revokeGuestAccess,
    updateOrganizationAccessType,
    getGuestAccessUrl,
    loading,
  };
};