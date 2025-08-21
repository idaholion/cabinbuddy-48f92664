import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useReservationConflicts } from '@/hooks/useReservationConflicts';
import { useUserRole } from '@/hooks/useUserRole';

interface ReservationData {
  start_date: string;
  end_date: string;
  family_group: string;
  guest_count?: number;
  total_cost?: number;
  property_name?: string;
  status?: string;
  allocated_start_date?: string;
  allocated_end_date?: string;
  time_period_number?: number;
  nights_used?: number;
  host_assignments?: any[];
}

export const useReservations = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { validateReservationDates } = useReservationConflicts();
  const { isGroupLead, userFamilyGroup, userHostInfo } = useUserRole();
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

  const createReservation = async (reservationData: ReservationData, testOverrideMode: boolean = false) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to create a reservation.",
        variant: "destructive",
      });
      return null;
    }

    // Skip permission checks in test override mode
    if (!testOverrideMode) {
      // Check if user has permission to make reservations for their family group
      const canMakeReservation = isGroupLead || (userHostInfo && userHostInfo.canHost);
      if (!canMakeReservation) {
        toast({
          title: "Permission Denied",
          description: "Only group leads and authorized hosts can make reservations.",
          variant: "destructive",
        });
        return null;
      }

      // Ensure user can only make reservations for their own family group
      if (userFamilyGroup && reservationData.family_group !== userFamilyGroup.name) {
        toast({
          title: "Permission Denied",
          description: "You can only make reservations for your own family group.",
          variant: "destructive",
        });
        return null;
      }
    }

    // Validate dates and check for conflicts
    const validation = await validateReservationDates(
      reservationData.start_date,
      reservationData.end_date,
      reservationData.family_group,
      reservationData.property_name
    );

    if (!validation.isValid) {
      toast({
        title: "Reservation Conflict",
        description: validation.errors.join('. '),
        variant: "destructive",
      });
      return null;
    }

    if (validation.warnings.length > 0) {
      toast({
        title: "Booking Warning",
        description: validation.warnings.join('. '),
        variant: "default",
      });
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

  const updateReservation = async (reservationId: string, updates: Partial<ReservationData>, testOverrideMode: boolean = false) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to update a reservation.",
        variant: "destructive",
      });
      return null;
    }

    // Skip permission checks in test override mode
    if (!testOverrideMode) {
      // Check if user has permission to modify reservations
      const canModifyReservation = isGroupLead || (userHostInfo && userHostInfo.canHost);
      if (!canModifyReservation) {
        toast({
          title: "Permission Denied",
          description: "Only group leads and authorized hosts can modify reservations.",
          variant: "destructive",
        });
        return null;
      }

      // Get current reservation to check family group ownership
      const currentReservation = reservations.find(r => r.id === reservationId);
      if (userFamilyGroup && currentReservation?.family_group !== userFamilyGroup.name) {
        toast({
          title: "Permission Denied",
          description: "You can only modify reservations for your own family group.",
          variant: "destructive",
        });
        return null;
      }
    }

    // If updating dates, validate for conflicts
    if (updates.start_date || updates.end_date) {
      const currentReservation = reservations.find(r => r.id === reservationId);
      const startDate = updates.start_date || currentReservation?.start_date;
      const endDate = updates.end_date || currentReservation?.end_date;
      const familyGroup = updates.family_group || currentReservation?.family_group;

      const validation = await validateReservationDates(
        startDate,
        endDate,
        familyGroup,
        updates.property_name || currentReservation?.property_name,
        reservationId // Exclude current reservation from conflict check
      );

      if (!validation.isValid) {
        toast({
          title: "Update Conflict",
          description: validation.errors.join('. '),
          variant: "destructive",
        });
        return null;
      }

      if (validation.warnings.length > 0) {
        toast({
          title: "Update Warning",
          description: validation.warnings.join('. '),
          variant: "default",
        });
      }
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
    validateReservationDates,
  };
};