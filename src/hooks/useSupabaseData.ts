import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { GroupMember } from '@/types/group-member';

// Types for our data structures
export interface Organization {
  id: string;
  code: string;
  name: string;
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

export interface FamilyGroup {
  id: string;
  organization_id: string;
  name: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  host_members?: GroupMember[];
}

export interface ReservationSettings {
  id: string;
  organization_id: string;
  property_name?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  nightly_rate?: number;
  cleaning_fee?: number;
  pet_fee?: number;
  damage_deposit?: number;
  financial_method?: string;
}

export interface CustomChecklist {
  id: string;
  organization_id: string;
  checklist_type: 'arrival' | 'daily';
  items: any[];
}

export interface CheckinSession {
  id: string;
  organization_id: string;
  user_id?: string;
  session_type: 'arrival' | 'daily';
  check_date: string;
  family_group?: string;
  guest_names?: string[];
  checklist_responses: Record<string, any>;
  notes?: string;
  completed_at?: string;
}

export interface SurveyResponse {
  id: string;
  organization_id: string;
  user_id?: string;
  family_group?: string;
  responses: Record<string, any>;
}

export interface Receipt {
  id: string;
  organization_id: string;
  user_id?: string;
  family_group?: string;
  description: string;
  amount: number;
  date: string;
  image_url?: string;
}

// Custom hook for organization data
export const useOrganization = () => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrganization();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrganization = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (profile?.organization_id) {
        const { data: org, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

        if (error) throw error;
        setOrganization(org);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (orgData: Omit<Organization, 'id'>) => {
    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user profile with organization_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      setOrganization(org);
      toast({ title: "Organization created successfully!" });
      return org;
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({ title: "Error creating organization", variant: "destructive" });
    }
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    if (!organization) return;

    try {
      const { data: org, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id)
        .select()
        .single();

      if (error) throw error;
      setOrganization(org);
      toast({ title: "Organization updated successfully!" });
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({ title: "Error updating organization", variant: "destructive" });
    }
  };

  return {
    organization,
    loading,
    createOrganization,
    updateOrganization,
    refetch: fetchOrganization
  };
};

// Custom hook for family groups
export const useFamilyGroups = () => {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyGroups();
  }, []);

  const fetchFamilyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      // Parse the JSONB host_members field
      const parsedData = (data || []).map((group: any) => ({
        ...group,
        host_members: Array.isArray(group.host_members) ? (group.host_members as unknown as GroupMember[]) : []
      }));
      setFamilyGroups(parsedData);
    } catch (error) {
      console.error('Error fetching family groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFamilyGroup = async (groupData: Omit<FamilyGroup, 'id' | 'organization_id'>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('family_groups')
        .insert({ 
          ...groupData, 
          organization_id: profile.organization_id,
          host_members: groupData.host_members as any // Cast to any for JSONB
        })
        .select()
        .single();

      if (error) throw error;
      // Parse the new group data
      const parsedData = {
        ...data,
        host_members: Array.isArray(data.host_members) ? (data.host_members as unknown as GroupMember[]) : []
      };
      setFamilyGroups(prev => [...prev, parsedData]);
      toast({ title: "Family group created successfully!" });
    } catch (error) {
      console.error('Error creating family group:', error);
      toast({ title: "Error creating family group", variant: "destructive" });
    }
  };

  return {
    familyGroups,
    loading,
    createFamilyGroup,
    refetch: fetchFamilyGroups
  };
};

// Custom hook for reservation settings
export const useReservationSettings = () => {
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('reservation_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      setSettings(data);
    } catch (error) {
      console.error('Error fetching reservation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsData: Omit<ReservationSettings, 'id' | 'organization_id'>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      if (settings) {
        // Update existing
        const { data, error } = await supabase
          .from('reservation_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      } else {
        // Create new
        const { data, error } = await supabase
          .from('reservation_settings')
          .insert({ ...settingsData, organization_id: profile.organization_id })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      toast({ title: "Reservation settings saved successfully!" });
    } catch (error) {
      console.error('Error saving reservation settings:', error);
      toast({ title: "Error saving reservation settings", variant: "destructive" });
    }
  };

  return {
    settings,
    loading,
    saveSettings,
    refetch: fetchSettings
  };
};