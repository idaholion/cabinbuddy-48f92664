import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useReservationConflicts } from '@/hooks/useReservationConflicts';
import { useUserRole } from '@/hooks/useUserRole';
import { useTimePeriods } from '@/hooks/useTimePeriods';

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
  original_reservation_id?: string;
  transfer_type?: string;
  transferred_from?: string;
  transferred_to?: string;
}

export const useReservations = (adminViewMode: { enabled: boolean; familyGroup?: string } = { enabled: false }) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { validateReservationDates } = useReservationConflicts();
  const { isGroupLead, userFamilyGroup, userHostInfo, isCalendarKeeper } = useUserRole();
  const { forceReconcileUsageData } = useTimePeriods();
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);

  const fetchReservations = async () => {
    if (!user || !organization?.id) return;

    console.log('Fetching reservations from database...');
    setLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id);

      // If admin view mode is enabled and a specific family group is selected
      if (adminViewMode.enabled && adminViewMode.familyGroup && adminViewMode.familyGroup !== 'all') {
        query = query.eq('family_group', adminViewMode.familyGroup);
      }

      const { data, error } = await query.order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching reservations:', error);
        return;
      }

      console.log('Fetched reservations from DB:', data);
      setReservations(data || []);
      console.log('Set reservations state to:', data?.length || 0, 'items');
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
      reservationData.property_name,
      undefined, // No exclusion for new reservations
      false, // isEditMode
      testOverrideMode // adminOverride
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

  // Helper function to get family group from host assignments
  const getFamilyGroupFromHostAssignments = async (hostAssignments: any[]): Promise<string | null> => {
    if (!hostAssignments || !Array.isArray(hostAssignments) || hostAssignments.length === 0) {
      return null;
    }

    const primaryHost = hostAssignments[0];
    if (!primaryHost?.host_email || !organization?.id) {
      return null;
    }

    // Find the family group that contains this host
    const { data: familyGroups, error } = await supabase
      .from('family_groups')
      .select('name, lead_email, host_members')
      .eq('organization_id', organization.id);

    if (error || !familyGroups) {
      return null;
    }

    for (const familyGroup of familyGroups) {
      // Check if the host is the family group lead
      if (familyGroup.lead_email === primaryHost.host_email) {
        return familyGroup.name;
      }

      // Check if the host is in the host_members array
      if (familyGroup.host_members && Array.isArray(familyGroup.host_members)) {
        const isHostMember = familyGroup.host_members.some((member: any) => 
          member.email === primaryHost.host_email
        );
        if (isHostMember) {
          return familyGroup.name;
        }
      }
    }

    return null;
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

    // Skip permission checks in test override mode OR if user is calendar keeper
    if (!testOverrideMode && !isCalendarKeeper) {
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
        reservationId, // Exclude current reservation from conflict check
        true, // isEditMode
        testOverrideMode || isCalendarKeeper // adminOverride
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
      // If host assignments are being updated, sync the family_group field
      let finalUpdates = { ...updates };
      if (updates.host_assignments && Array.isArray(updates.host_assignments)) {
        const inferredFamilyGroup = await getFamilyGroupFromHostAssignments(updates.host_assignments);
        if (inferredFamilyGroup) {
          finalUpdates.family_group = inferredFamilyGroup;
        }
      }

      const { data: updatedReservation, error } = await supabase
        .from('reservations')
        .update(finalUpdates)
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
      
      console.log('Updated reservations state with:', updatedReservation);
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

  const deleteReservation = async (reservationId: string, testOverrideMode: boolean = false) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to delete a reservation.",
        variant: "destructive",
      });
      return false;
    }

    // Skip permission checks in test override mode OR if user is calendar keeper
    if (!testOverrideMode && !isCalendarKeeper) {
      // Check if user has permission to modify reservations
      const canModifyReservation = isGroupLead || (userHostInfo && userHostInfo.canHost);
      if (!canModifyReservation) {
        toast({
          title: "Permission Denied",
          description: "Only group leads and authorized hosts can delete reservations.",
          variant: "destructive",
        });
        return false;
      }

      // Get current reservation to check family group ownership
      const currentReservation = reservations.find(r => r.id === reservationId);
      if (userFamilyGroup && currentReservation?.family_group !== userFamilyGroup.name) {
        toast({
          title: "Permission Denied",
          description: "You can only delete reservations for your own family group.",
          variant: "destructive",
        });
        return false;
      }
    }

    setLoading(true);
    try {
      // Get the reservation to determine which year to reconcile
      const reservationToDelete = reservations.find(r => r.id === reservationId);
      
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error deleting reservation:', error);
        toast({
          title: "Error",
          description: "Failed to delete reservation. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Remove from local state
      setReservations(prev => prev.filter(res => res.id !== reservationId));
      
      // Force reconciliation to update usage counts in real-time
      // Use the year from the deleted reservation to ensure we reconcile the correct year
      if (reservationToDelete?.start_date) {
        const reservationYear = new Date(reservationToDelete.start_date).getFullYear();
        console.log('[deleteReservation] Reconciling year:', reservationYear);
        await forceReconcileUsageData(reservationYear);
      } else {
        // Fallback to current year if we can't determine reservation year
        const currentYear = new Date().getFullYear();
        await forceReconcileUsageData(currentYear);
      }
      
      toast({
        title: "Success",
        description: "Reservation deleted successfully!",
      });

      return true;
    } catch (error) {
      console.error('Error in deleteReservation:', error);
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
    if (organization?.id) {
      fetchReservations();
    }
  }, [organization?.id, adminViewMode.enabled, adminViewMode.familyGroup]);

  // Add real-time subscription for reservations
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('Real-time reservation change:', payload);
          // Refetch reservations to ensure all components have latest data
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  return {
    reservations,
    loading,
    createReservation,
    updateReservation,
    deleteReservation,
    refetchReservations: fetchReservations,
    validateReservationDates,
  };
};