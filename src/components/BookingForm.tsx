import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useReservations } from '@/hooks/useReservations';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { cn } from '@/lib/utils';

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: Date;
  onBookingComplete?: () => void;
  editingReservation?: {
    id: string;
    start_date: string;
    end_date: string;
    family_group: string;
    guest_count: number;
    total_cost?: number;
    allocated_start_date?: string;
    allocated_end_date?: string;
  } | null;
}

interface BookingFormData {
  startDate: Date;
  endDate: Date;
  familyGroup: string;
  guestCount: number;
  totalCost?: number;
}

export function BookingForm({ open, onOpenChange, currentMonth, onBookingComplete, editingReservation }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { familyGroups } = useFamilyGroups();
  const { createReservation, updateReservation, loading: reservationLoading } = useReservations();
  const { rotationData, getRotationForYear } = useRotationOrder();
  const { 
    calculateTimePeriodWindows, 
    validateBooking, 
    updateTimePeriodUsage,
    timePeriodUsage 
  } = useTimePeriods();

  // Get user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email === user?.email)
  )?.name;

  // Get current rotation order and determine whose turn it is
  const currentYear = currentMonth.getFullYear();
  const rotationOrder = getRotationForYear(currentYear);
  const currentTurnIndex = Math.floor((currentMonth.getMonth()) / (rotationData?.max_time_slots || 2)) % rotationOrder.length;
  const currentTurnGroup = rotationOrder[currentTurnIndex];

  // Filter family groups - only show user's group if it's their turn, or all groups if user is admin
  const availableFamilyGroups = userFamilyGroup === currentTurnGroup 
    ? familyGroups.filter(fg => fg.name === userFamilyGroup)
    : familyGroups; // Allow admins to book for any group
  
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BookingFormData>({
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      familyGroup: '',
      guestCount: 1,
      totalCost: 0
    }
  });

  // Populate form when editing
  useEffect(() => {
    if (editingReservation) {
      form.reset({
        startDate: new Date(editingReservation.start_date),
        endDate: new Date(editingReservation.end_date),
        familyGroup: editingReservation.family_group,
        guestCount: editingReservation.guest_count,
        totalCost: editingReservation.total_cost || 0
      });
    } else {
      form.reset({
        startDate: new Date(),
        endDate: new Date(),
        familyGroup: '',
        guestCount: 1,
        totalCost: 0
      });
    }
  }, [editingReservation, form]);

  const watchedStartDate = form.watch('startDate');
  const watchedEndDate = form.watch('endDate');
  const watchedFamilyGroup = form.watch('familyGroup');

  // Calculate time period windows for current month
  const timePeriodWindows = calculateTimePeriodWindows(
    currentMonth.getFullYear(),
    currentMonth
  );

  // Custom validation for edit mode
  const validateEditBooking = (startDate: Date, endDate: Date, familyGroup: string) => {
    const errors: string[] = [];
    
    if (!editingReservation) return { isValid: false, errors: ["No reservation to edit"] };
    
    // Can't extend beyond original allocated period
    const originalStart = new Date(editingReservation.allocated_start_date!);
    const originalEnd = new Date(editingReservation.allocated_end_date!);
    
    if (startDate < originalStart) {
      errors.push(`Cannot move start date before original allocated period (${format(originalStart, "PPP")})`);
    }
    if (endDate > originalEnd) {
      errors.push(`Cannot extend end date beyond original allocated period (${format(originalEnd, "PPP")})`);
    }
    
    // Can't extend duration
    const originalDuration = Math.ceil((new Date(editingReservation.end_date).getTime() - new Date(editingReservation.start_date).getTime()) / (1000 * 60 * 60 * 24));
    const newDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (newDuration > originalDuration) {
      errors.push(`Cannot extend booking duration. Original: ${originalDuration} days, New: ${newDuration} days`);
    }
    
    return { isValid: errors.length === 0, errors };
  };

  // Validate current form state
  const currentValidation = watchedStartDate && watchedEndDate && watchedFamilyGroup
    ? editingReservation 
      ? validateEditBooking(watchedStartDate, watchedEndDate, watchedFamilyGroup)
      : validateBooking(watchedStartDate, watchedEndDate, watchedFamilyGroup, timePeriodWindows)
    : { isValid: false, errors: [] };

  // Find the relevant time period window for the selected family group
  const relevantWindow = timePeriodWindows.find(window => 
    window.familyGroup === watchedFamilyGroup &&
    watchedStartDate >= window.startDate &&
    watchedEndDate <= window.endDate
  );

  // Check if family group can still make bookings
  const familyUsage = timePeriodUsage.find(u => u.family_group === watchedFamilyGroup);
  const canMakeBooking = !familyUsage || familyUsage.time_periods_used < familyUsage.time_periods_allowed;

  const onSubmit = async (data: BookingFormData) => {
    // Final validation
    const validation = editingReservation 
      ? validateEditBooking(data.startDate, data.endDate, data.familyGroup)
      : validateBooking(data.startDate, data.endDate, data.familyGroup, timePeriodWindows);
    
    if (!validation.isValid) {
      toast({
        title: editingReservation ? "Edit Invalid" : "Booking Invalid",
        description: validation.errors.join('. '),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const nights = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (editingReservation) {
        // Update existing reservation
        const updatedReservation = await updateReservation(editingReservation.id, {
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          guest_count: data.guestCount,
          total_cost: data.totalCost,
          nights_used: nights
        });

        if (updatedReservation) {
          toast({
            title: "Booking Updated",
            description: `Successfully updated booking for ${data.familyGroup}`,
          });

          form.reset();
          onOpenChange(false);
          onBookingComplete?.();
        }
      } else {
        // Create new reservation
        const window = timePeriodWindows.find(w => 
          w.familyGroup === data.familyGroup &&
          data.startDate >= w.startDate &&
          data.endDate <= w.endDate
        );

        const reservation = await createReservation({
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          family_group: data.familyGroup,
          guest_count: data.guestCount,
          total_cost: data.totalCost,
          allocated_start_date: window?.startDate.toISOString().split('T')[0],
          allocated_end_date: window?.endDate.toISOString().split('T')[0],
          time_period_number: window?.periodNumber,
          nights_used: nights
        });

        if (reservation) {
          await updateTimePeriodUsage(data.familyGroup, currentMonth.getFullYear());
          
          toast({
            title: "Booking Confirmed",
            description: `Successfully booked ${nights} nights for ${data.familyGroup}`,
          });

          form.reset();
          onOpenChange(false);
          onBookingComplete?.();
        }
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      toast({
        title: editingReservation ? "Update Failed" : "Booking Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingReservation ? 'Edit Booking' : 'New Booking'}</DialogTitle>
          {userFamilyGroup && (
            <div className="mt-2 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">
                {userFamilyGroup === currentTurnGroup ? (
                  <>
                    <span className="text-primary">✓ It's your family group's turn to book!</span>
                    <br />
                    <span className="text-muted-foreground">
                      Time periods available: {familyUsage ? 
                        Math.max(0, familyUsage.time_periods_allowed - familyUsage.time_periods_used) : 
                        rotationData?.max_time_slots || 2} remaining
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Current turn: {currentTurnGroup} • Your group: {userFamilyGroup}
                  </span>
                )}
              </p>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Family Group Selection */}
            <FormField
              control={form.control}
              name="familyGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Group</FormLabel>
                  <FormControl>
                    <select 
                      {...field} 
                      className="w-full p-2 border rounded-md bg-background"
                      required
                    >
                      <option value="">Select Family Group</option>
                      {availableFamilyGroups.map((group) => (
                        <option key={group.id} value={group.name}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-in Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-out Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date <= watchedStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Guest Count */}
            <FormField
              control={form.control}
              name="guestCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Guests</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="20"
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Period Info */}
            {relevantWindow && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Time Period Information</h4>
                <div className="text-sm space-y-1">
                  <p>Allocated Period: {format(relevantWindow.startDate, "PPP")} - {format(relevantWindow.endDate, "PPP")}</p>
                  <p>Maximum Nights: {relevantWindow.maxNights}</p>
                  {familyUsage && (
                    <p>Periods Used: {familyUsage.time_periods_used} / {familyUsage.time_periods_allowed}</p>
                  )}
                </div>
              </div>
            )}

            {/* Validation Messages */}
            {!currentValidation.isValid && currentValidation.errors.length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-medium text-destructive mb-2">Booking Issues:</h4>
                <ul className="text-sm text-destructive space-y-1">
                  {currentValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {!canMakeBooking && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  This family group has already used all allocated time periods for this year.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  !currentValidation.isValid || 
                  !canMakeBooking || 
                  submitting || 
                  reservationLoading
                }
              >
                {submitting ? "Creating Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}