import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Reservation {
  id: string;
  organization_id: string;
  user_id: string;
  family_group: string;
  start_date: string;
  end_date: string;
  guest_count?: number;
  total_cost?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  property_name?: string;
  host_assignments?: any[];
  allocated_start_date?: string;
  allocated_end_date?: string;
  nights_used?: number;
  time_period_number?: number;
  created_at: string;
  updated_at: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingReservations?: Reservation[];
  message?: string;
}

export interface AvailabilityStatus {
  date: string;
  isAvailable: boolean;
  reservations: Reservation[];
  isBuffer?: boolean;
}

export const useReservations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user organization
  const { data: userOrg } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      return profile?.organization_id || null;
    },
    enabled: !!user?.id,
  });

  // Fetch reservations
  const { data: reservations = [], isLoading, error } = useQuery({
    queryKey: ['reservations', userOrg],
    queryFn: async () => {
      if (!userOrg) return [];
      
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', userOrg)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!userOrg,
  });

  // Check availability for date ranges
  const checkAvailability = async (
    dateRanges: DateRange[], 
    excludeReservationId?: string
  ): Promise<ConflictInfo> => {
    if (!userOrg) {
      return { hasConflict: true, conflictingReservations: [], message: 'No organization found' };
    }

    const conflicts: Reservation[] = [];

    for (const range of dateRanges) {
      const startDate = range.start.toISOString().split('T')[0];
      const endDate = range.end.toISOString().split('T')[0];

      const { data: conflictingReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', userOrg)
        .neq('status', 'cancelled')
        .or(
          `and(start_date.lte.${endDate},end_date.gte.${startDate})`
        );

      if (conflictingReservations) {
        const filteredConflicts = conflictingReservations.filter(
          r => r.id !== excludeReservationId
        );
        conflicts.push(...filteredConflicts as Reservation[]);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflictingReservations: conflicts,
      message: conflicts.length > 0 
        ? `Found ${conflicts.length} conflicting reservation(s)` 
        : 'No conflicts found'
    };
  };

  // Get availability status for a date range
  const getAvailabilityStatus = async (
    startDate: Date,
    endDate: Date
  ): Promise<AvailabilityStatus[]> => {
    if (!userOrg) return [];

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data: reservationsInRange } = await supabase
      .from('reservations')
      .select('*')
      .eq('organization_id', userOrg)
      .neq('status', 'cancelled')
      .or(`and(start_date.lte.${end},end_date.gte.${start})`);

    const statusMap: { [date: string]: AvailabilityStatus } = {};
    
    // Initialize all dates as available
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      statusMap[dateStr] = {
        date: dateStr,
        isAvailable: true,
        reservations: [],
      };
      current.setDate(current.getDate() + 1);
    }

    // Mark dates with reservations as unavailable
    reservationsInRange?.forEach((reservation) => {
      const resStart = new Date(reservation.start_date);
      const resEnd = new Date(reservation.end_date);
      
      const current = new Date(resStart);
      while (current <= resEnd) {
        const dateStr = current.toISOString().split('T')[0];
        if (statusMap[dateStr]) {
          statusMap[dateStr].isAvailable = false;
          statusMap[dateStr].reservations.push(reservation as Reservation);
        }
        current.setDate(current.getDate() + 1);
      }
    });

    return Object.values(statusMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Create reservation mutation
  const createReservation = useMutation({
    mutationFn: async (reservationData: {
      family_group: string;
      start_date: string;
      end_date: string;
      guest_count?: number;
      total_cost?: number;
      status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
      property_name?: string;
      nights_used?: number;
      time_period_number?: number;
    }) => {
      if (!userOrg || !user?.id) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          ...reservationData,
          organization_id: userOrg,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({
        title: "Reservation Created",
        description: "Your reservation has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Reservation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update reservation mutation
  const updateReservation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Reservation> }) => {
      const { data, error } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', userOrg)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({
        title: "Reservation Updated",
        description: "Your reservation has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Reservation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete reservation mutation
  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id)
        .eq('organization_id', userOrg);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({
        title: "Reservation Deleted",
        description: "Your reservation has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting Reservation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    reservations,
    isLoading,
    error,
    checkAvailability,
    getAvailabilityStatus,
    createReservation,
    updateReservation,
    deleteReservation,
    userOrg,
  };
};