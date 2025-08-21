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
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { HostAssignmentForm, type HostAssignment } from '@/components/HostAssignmentForm';

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: Date;
  onBookingComplete?: () => void;
  testOverrideMode?: boolean;
  selectedStartDate?: Date | null;
  selectedEndDate?: Date | null;
  prefilledFamilyGroup?: string;
  prefilledHost?: string;
  editingReservation?: {
    id: string;
    start_date: string;
    end_date: string;
    family_group: string;
    total_cost?: number;
    allocated_start_date?: string;
    allocated_end_date?: string;
    host_assignments?: any[];
  } | null;
}

interface BookingFormData {
  startDate: Date;
  endDate: Date;
  familyGroup: string;
  totalCost?: number;
  hostAssignments: HostAssignment[];
}

export function BookingForm({ open, onOpenChange, currentMonth, onBookingComplete, editingReservation, testOverrideMode = false, selectedStartDate, selectedEndDate, prefilledFamilyGroup, prefilledHost }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { familyGroups } = useFamilyGroups();
  const { isGroupLead, isGroupMember, isHost, isCalendarKeeper, userFamilyGroup, userHostInfo } = useUserRole();
  const { createReservation, updateReservation, loading: reservationLoading } = useReservations();
  const { rotationData, getRotationForYear } = useRotationOrder();
  const { 
    calculateTimePeriodWindows, 
    validateBooking, 
    updateTimePeriodUsage,
    timePeriodUsage 
  } = useTimePeriods();

  // Get user's family group name for legacy compatibility  
  const userFamilyGroupName = userFamilyGroup?.name;

  // Get current rotation order and determine whose turn it is
  const currentYear = currentMonth.getFullYear();
  const rotationOrder = getRotationForYear(currentYear);
  const currentTurnIndex = Math.floor((currentMonth.getMonth()) / (rotationData?.max_time_slots || 2)) % rotationOrder.length;
  const currentTurnGroup = rotationOrder[currentTurnIndex];

  // Filter family groups based on user role
  const availableFamilyGroups = testOverrideMode 
    ? familyGroups // Show all groups in test mode
    : isGroupMember
      ? familyGroups.filter(fg => fg.name === userFamilyGroupName) // Group members only see their group
      : familyGroups; // Group leads and calendar keepers can see all groups
  
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BookingFormData>({
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      familyGroup: '',
      totalCost: 0,
      hostAssignments: []
    }
  });

  // Populate form when editing
  useEffect(() => {
    if (editingReservation) {
      // Parse existing host assignments if available
      const existingAssignments = editingReservation.host_assignments || [];
      const parsedAssignments = Array.isArray(existingAssignments) ? 
        existingAssignments.map((assignment: any) => ({
          host_name: assignment.host_name || '',
          host_email: assignment.host_email || '',
          start_date: new Date(assignment.start_date),
          end_date: new Date(assignment.end_date)
        })) : [];

      form.reset({
        startDate: new Date(editingReservation.start_date),
        endDate: new Date(editingReservation.end_date),
        familyGroup: editingReservation.family_group,
        totalCost: editingReservation.total_cost || 0,
        hostAssignments: parsedAssignments
      });
    } else {
      // Use selected dates from calendar if provided, otherwise default to today
      const defaultStartDate = selectedStartDate || new Date();
      const defaultEndDate = selectedEndDate || new Date();
      
      // Determine default family group based on user role and prefilled values
      let defaultFamilyGroup = '';
      let defaultHostAssignments: HostAssignment[] = [];
      
      
      // Use prefilled values if provided, otherwise fall back to user defaults
      if (prefilledFamilyGroup) {
        defaultFamilyGroup = prefilledFamilyGroup;
        
        // Add prefilled host if provided
        if (prefilledHost) {
          const selectedGroup = familyGroups.find(fg => fg.name === prefilledFamilyGroup);
          const hostMember = selectedGroup?.host_members?.find((h: any) => h.name === prefilledHost);
          
          if (hostMember) {
            defaultHostAssignments = [{
              host_name: hostMember.name,
              host_email: hostMember.email,
              start_date: defaultStartDate,
              end_date: defaultEndDate
            }];
          }
        }
      } else if (isGroupMember && userHostInfo && userFamilyGroup) {
        // For group members: default to their family group and add themselves as host if they can host
        defaultFamilyGroup = userFamilyGroup.name;
        if (isHost) {
           defaultHostAssignments = [{
             host_name: userHostInfo.name,
             host_email: userHostInfo.email,
             start_date: defaultStartDate,
             end_date: defaultEndDate
           }];
         }
       } else if ((isGroupLead || isCalendarKeeper) && userFamilyGroup) {
        // For group leads and calendar keepers: default to their family group
        defaultFamilyGroup = userFamilyGroup.name;
        
        // If calendar keeper has host info, add themselves as default host
        if (isCalendarKeeper && userHostInfo) {
          defaultHostAssignments = [{
            host_name: userHostInfo.name,
            host_email: userHostInfo.email,
            start_date: defaultStartDate,
            end_date: defaultEndDate
          }];
        }
      }
      
      
      
      form.reset({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        familyGroup: defaultFamilyGroup,
        totalCost: 0,
        hostAssignments: defaultHostAssignments
      });
    }
  }, [editingReservation, form, selectedStartDate, selectedEndDate, isGroupMember, isHost, isGroupLead, isCalendarKeeper, userFamilyGroup, userHostInfo, prefilledFamilyGroup, prefilledHost, familyGroups]);

  const watchedStartDate = form.watch('startDate');
  const watchedEndDate = form.watch('endDate');
  const watchedFamilyGroup = form.watch('familyGroup');
  const watchedHostAssignments = form.watch('hostAssignments');

  // Get the selected family group's host members
  const selectedFamilyGroup = familyGroups.find(fg => fg.name === watchedFamilyGroup);
  
  // Combine group lead with host members to ensure leads can be selected as hosts
  const familyGroupHosts = selectedFamilyGroup ? 
    [
      // Include group lead if they exist (email not required in override mode)
      ...(selectedFamilyGroup.lead_name && (selectedFamilyGroup.lead_email || testOverrideMode) ? 
        [{
          name: selectedFamilyGroup.lead_name,
          email: selectedFamilyGroup.lead_email || `${selectedFamilyGroup.lead_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: selectedFamilyGroup.lead_phone || ''
        }] : []
      ),
      // Include all host members
      ...(selectedFamilyGroup.host_members || [])
    ].filter((host, index, arr) => 
      // Remove duplicates based on email
      arr.findIndex(h => h.email?.toLowerCase() === host.email?.toLowerCase()) === index
    ) : [];

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

  // Validate current form state - bypass validation in test mode
  const currentValidation = watchedStartDate && watchedEndDate && watchedFamilyGroup
    ? testOverrideMode 
      ? { isValid: true, errors: [] } // Always valid in test mode
      : editingReservation 
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
    // Final validation - bypass in test mode
    const validation = testOverrideMode 
      ? { isValid: true, errors: [] } // Always valid in test mode
      : editingReservation 
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
        const hostAssignmentsData = data.hostAssignments.map(assignment => ({
          host_name: assignment.host_name,
          host_email: assignment.host_email,
          start_date: assignment.start_date.toISOString().split('T')[0],
          end_date: assignment.end_date.toISOString().split('T')[0]
        }));

        const updatedReservation = await updateReservation(editingReservation.id, {
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          total_cost: data.totalCost,
          nights_used: nights,
          host_assignments: hostAssignmentsData
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

        const hostAssignmentsData = data.hostAssignments.map(assignment => ({
          host_name: assignment.host_name,
          host_email: assignment.host_email,
          start_date: assignment.start_date.toISOString().split('T')[0],
          end_date: assignment.end_date.toISOString().split('T')[0]
        }));

        const reservation = await createReservation({
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          family_group: data.familyGroup,
          total_cost: data.totalCost,
          allocated_start_date: window?.startDate.toISOString().split('T')[0],
          allocated_end_date: window?.endDate.toISOString().split('T')[0],
          time_period_number: window?.periodNumber,
          nights_used: nights,
          host_assignments: hostAssignmentsData
        }, testOverrideMode); // Pass testOverrideMode parameter

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
          
          {/* Test Override Mode Indicator */}
          {testOverrideMode && (
            <div className="mt-2 p-3 bg-orange-100 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-700">
                🧪 Test Mode Active - All time window restrictions bypassed
              </p>
            </div>
          )}
          
          {userFamilyGroupName && !testOverrideMode && (
            <div className="mt-2 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">
                {userFamilyGroupName === currentTurnGroup ? (
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
                    Current turn: {currentTurnGroup} • Your group: {userFamilyGroupName}
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
                      disabled={(isGroupMember && !isGroupLead && !isCalendarKeeper) && !testOverrideMode} // Bypass restrictions in test mode
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

            {/* Host Selection */}
            {watchedFamilyGroup && selectedFamilyGroup && (
              <FormField
                control={form.control}
                name="hostAssignments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Host</FormLabel>
                    <FormControl>
                      <select 
                        className="w-full p-2 border rounded-md bg-background"
                        value={field.value?.[0]?.host_name || ''}
                        onChange={(e) => {
                          const selectedHost = familyGroupHosts.find((host: any) => host.name === e.target.value);
                          if (selectedHost) {
                            field.onChange([{
                              host_name: selectedHost.name,
                              host_email: selectedHost.email,
                              start_date: watchedStartDate,
                              end_date: watchedEndDate
                            }]);
                          }
                        }}
                        disabled={(isGroupMember && !isGroupLead && !isCalendarKeeper) && !testOverrideMode} // Bypass restrictions in test mode
                      >
                        <option value="">Select Host</option>
                        {familyGroupHosts.map((host: any) => (
                          <option key={host.email} value={host.name}>
                            {host.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

            {/* Host Assignments - Only show for calendar keepers or if not already set by role defaults */}
            {watchedFamilyGroup && watchedStartDate && watchedEndDate && !isGroupMember && !isGroupLead && !isCalendarKeeper && (
              <HostAssignmentForm
                reservationStartDate={watchedStartDate}
                reservationEndDate={watchedEndDate}
                familyGroupHosts={familyGroupHosts}
                value={watchedHostAssignments}
                onChange={(assignments) => form.setValue('hostAssignments', assignments)}
                disabled={submitting || reservationLoading}
              />
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