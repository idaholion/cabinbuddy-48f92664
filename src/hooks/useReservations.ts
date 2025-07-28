import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface ReservationData {
  start_date: string;
  end_date: string;
  family_group: string;
  guest_count?: number;
  total_cost?: number;
  property_name?: string;
  status?: string;
}

export const useReservations = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);

  const fetchReservations = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching reservations:', error);
        return;
      }

      setReservations(data || []);
    } catch (error) {
      console.error('Error in fetchReservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (reservationData: ReservationData) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to create a reservation.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...reservationData,
        organization_id: organization.id,
        user_id: user.id,
        status: reservationData.status || 'confirmed'
      };

      const { data: newReservation, error } = await supabase
        .from('reservations')
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error('Error creating reservation:', error);
        toast({
          title: "Error",
          description: "Failed to create reservation. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      setReservations(prev => [...prev, newReservation]);
      toast({
        title: "Success",
        description: "Reservation created successfully!",
      });

      return newReservation;
    } catch (error) {
      console.error('Error in createReservation:', error);
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

  const updateReservation = async (reservationId: string, updates: Partial<ReservationData>) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to update a reservation.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const { data: updatedReservation, error } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', reservationId)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating reservation:', error);
        toast({
          title: "Error",
          description: "Failed to update reservation. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      setReservations(prev => 
        prev.map(res => res.id === reservationId ? updatedReservation : res)
      );
      
      toast({
        title: "Success",
        description: "Reservation updated successfully!",
      });

      return updatedReservation;
    } catch (error) {
      console.error('Error in updateReservation:', error);
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
      fetchReservations();
    }
  }, [organization?.id]);

  return {
    reservations,
    loading,
    createReservation,
    updateReservation,
    refetchReservations: fetchReservations,
  };
};