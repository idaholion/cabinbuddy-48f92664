import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';
import { useToast } from '@/hooks/use-toast';
import { parseFullName, sanitizeName } from '@/lib/name-utils';

interface Profile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  organization_id?: string;
  family_group?: string;
  family_role?: string;
  user_type: string;
  created_at: string;
  updated_at: string;
}

interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  organization_id?: string;
  family_group?: string;
  family_role?: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const { activeOrganization } = useRobustMultiOrganization();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch user profile
  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Update or create profile
  const updateProfile = async (updates: ProfileUpdateData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setUpdating(true);
      
      // Parse display_name into first/last if not already provided
      let parsedUpdates = { ...updates };
      if (updates.display_name && (!updates.first_name || !updates.last_name)) {
        const { firstName, lastName, displayName } = parseFullName(updates.display_name);
        parsedUpdates = {
          ...parsedUpdates,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
        };
      }
      
      // Sanitize all name fields
      if (parsedUpdates.first_name) parsedUpdates.first_name = sanitizeName(parsedUpdates.first_name);
      if (parsedUpdates.last_name) parsedUpdates.last_name = sanitizeName(parsedUpdates.last_name);
      if (parsedUpdates.display_name) parsedUpdates.display_name = sanitizeName(parsedUpdates.display_name);
      
      // Prepare the profile data
      const profileData = {
        user_id: user.id,
        organization_id: activeOrganization?.organization_id,
        ...parsedUpdates,
        updated_at: new Date().toISOString()
      };

      // Use upsert to create or update the profile
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully. Family group information will be synced automatically.",
      });

      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  // Create profile if it doesn't exist
  const createProfile = async (profileData: ProfileUpdateData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setUpdating(true);

      const newProfile = {
        user_id: user.id,
        organization_id: activeOrganization?.organization_id,
        user_type: 'regular',
        ...profileData,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      
      toast({
        title: "Profile created",
        description: "Your profile has been created successfully.",
      });

      return data;
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to create profile. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  // Delete profile
  const deleteProfile = async () => {
    if (!user || !profile) {
      throw new Error('No profile to delete');
    }

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setProfile(null);
      
      toast({
        title: "Profile deleted",
        description: "Your profile has been deleted successfully.",
      });

    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  // Auto-populate profile from user metadata
  const autoPopulateFromUserMetadata = async () => {
    if (!user || profile) return;

    const metadata = user.user_metadata;
    if (!metadata?.first_name && !metadata?.last_name) return;

    const profileData: ProfileUpdateData = {
      first_name: metadata.first_name,
      last_name: metadata.last_name,
      display_name: metadata.first_name || metadata.full_name,
    };

    await createProfile(profileData);
  };

  // Fetch profile when user or organization changes
  useEffect(() => {
    fetchProfile();
  }, [user?.id, activeOrganization?.organization_id]);

  // Auto-populate if no profile exists but user has metadata
  useEffect(() => {
    if (!loading && !profile && user) {
      autoPopulateFromUserMetadata();
    }
  }, [loading, profile, user]);

  return {
    profile,
    loading,
    updating,
    updateProfile,
    createProfile,
    deleteProfile,
    refetch: fetchProfile,
    hasProfile: !!profile
  };
};