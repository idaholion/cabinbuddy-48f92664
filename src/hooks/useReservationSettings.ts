import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface ReservationSettingsData {
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

export const useReservationSettings = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reservationSettings, setReservationSettings] = useState<any>(null);

  const fetchReservationSettings = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching reservation settings:', error);
        return;
      }

      setReservationSettings(data);
    } catch (error) {
      console.error('Error in fetchReservationSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReservationSettings = async (settingsData: ReservationSettingsData) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to save reservation settings.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...settingsData,
        organization_id: organization.id
      };

      if (reservationSettings?.id) {
        // Update existing settings
        const { data: updatedSettings, error } = await supabase
          .from('reservation_settings')
          .update(dataToSave)
          .eq('id', reservationSettings.id)
          .eq('organization_id', organization.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating reservation settings:', error);
          toast({
            title: "Error",
            description: "Failed to update reservation settings. Please try again.",
            variant: "destructive",
          });
          return null;
        }

        setReservationSettings(updatedSettings);
      } else {
        // Create new settings
        const { data: newSettings, error } = await supabase
          .from('reservation_settings')
          .insert(dataToSave)
          .select()
          .single();

        if (error) {
          console.error('Error creating reservation settings:', error);
          toast({
            title: "Error",
            description: "Failed to save reservation settings. Please try again.",
            variant: "destructive",
          });
          return null;
        }

        setReservationSettings(newSettings);
      }

      toast({
        title: "Success",
        description: "Reservation settings saved successfully!",
      });

      return reservationSettings;
    } catch (error) {
      console.error('Error in saveReservationSettings:', error);
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

  useEffect(() => {
    if (organization?.id) {
      fetchReservationSettings();
    }
  }, [organization?.id]);

  return {
    reservationSettings,
    loading,
    saveReservationSettings,
    refetchReservationSettings: fetchReservationSettings,
  };
};