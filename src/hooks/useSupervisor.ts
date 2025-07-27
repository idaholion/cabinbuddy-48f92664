import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Supervisor {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
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
  alternate_supervisor_email?: string;
  created_at: string;
  updated_at: string;
}

export const useSupervisor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);

  // Check if current user is a supervisor
  const checkSupervisorStatus = async () => {
    if (!user?.email) {
      setIsSupervisor(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('supervisors')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking supervisor status:', error);
        setIsSupervisor(false);
      } else {
        setIsSupervisor(!!data);
      }
    } catch (error) {
      console.error('Error checking supervisor status:', error);
      setIsSupervisor(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all organizations (supervisor only)
  const fetchOrganizations = async () => {
    if (!isSupervisor) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching organizations:', error);
        toast({
          title: "Error",
          description: "Failed to fetch organizations",
          variant: "destructive",
        });
      } else {
        setOrganizations(data || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  // Fetch all supervisors (supervisor only)
  const fetchSupervisors = async () => {
    if (!isSupervisor) return;

    try {
      const { data, error } = await supabase
        .from('supervisors')
        .select('*')
        .order('email');

      if (error) {
        console.error('Error fetching supervisors:', error);
        toast({
          title: "Error",
          description: "Failed to fetch supervisors",
          variant: "destructive",
        });
      } else {
        setSupervisors(data || []);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  // Add a new supervisor
  const addSupervisor = async (email: string, name?: string) => {
    if (!isSupervisor) return { error: new Error('Unauthorized') };

    try {
      const { data, error } = await supabase
        .from('supervisors')
        .insert([{ email, name, is_active: true }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add supervisor",
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Success",
        description: "Supervisor added successfully",
      });

      await fetchSupervisors();
      return { data };
    } catch (error) {
      console.error('Error adding supervisor:', error);
      return { error };
    }
  };

  // Update supervisor status
  const updateSupervisorStatus = async (id: string, is_active: boolean) => {
    if (!isSupervisor) return { error: new Error('Unauthorized') };

    try {
      const { error } = await supabase
        .from('supervisors')
        .update({ is_active })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update supervisor status",
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Success",
        description: "Supervisor status updated",
      });

      await fetchSupervisors();
      return { data: true };
    } catch (error) {
      console.error('Error updating supervisor:', error);
      return { error };
    }
  };

  // Delete all organization data
  const deleteOrganizationData = async (organizationId: string) => {
    if (!isSupervisor) return { error: new Error('Unauthorized') };

    try {
      // Delete in order due to foreign key constraints
      // Delete checkin_sessions
      let { error } = await supabase
        .from('checkin_sessions')
        .delete()
        .eq('organization_id', organizationId);
      if (error) return { error };

      // Delete survey_responses
      ({ error } = await supabase
        .from('survey_responses')
        .delete()
        .eq('organization_id', organizationId));
      if (error) return { error };

      // Delete receipts
      ({ error } = await supabase
        .from('receipts')
        .delete()
        .eq('organization_id', organizationId));
      if (error) return { error };

      // Delete custom_checklists
      ({ error } = await supabase
        .from('custom_checklists')
        .delete()
        .eq('organization_id', organizationId));
      if (error) return { error };

      // Delete reservation_settings
      ({ error } = await supabase
        .from('reservation_settings')
        .delete()
        .eq('organization_id', organizationId));
      if (error) return { error };

      // Delete family_groups
      ({ error } = await supabase
        .from('family_groups')
        .delete()
        .eq('organization_id', organizationId));
      if (error) return { error };

      // Finally delete the organization
      ({ error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId));
      if (error) return { error };

      toast({
        title: "Success",
        description: "Organization data deleted successfully",
      });

      await fetchOrganizations();
      return { data: true };
    } catch (error) {
      console.error('Error deleting organization data:', error);
      return { error };
    }
  };

  // Update organization alternate supervisor
  const updateAlternateSupervisor = async (organizationId: string, email: string) => {
    if (!isSupervisor) return { error: new Error('Unauthorized') };

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ alternate_supervisor_email: email })
        .eq('id', organizationId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update alternate supervisor",
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Success",
        description: "Alternate supervisor updated",
      });

      await fetchOrganizations();
      return { data: true };
    } catch (error) {
      console.error('Error updating alternate supervisor:', error);
      return { error };
    }
  };

  useEffect(() => {
    checkSupervisorStatus();
  }, [user]);

  useEffect(() => {
    if (isSupervisor) {
      fetchOrganizations();
      fetchSupervisors();
    }
  }, [isSupervisor]);

  return {
    isSupervisor,
    loading,
    organizations,
    supervisors,
    addSupervisor,
    updateSupervisorStatus,
    deleteOrganizationData,
    updateAlternateSupervisor,
    refetchOrganizations: fetchOrganizations,
    refetchSupervisors: fetchSupervisors,
  };
};