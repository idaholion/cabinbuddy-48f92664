import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useReservations } from '@/hooks/useReservations';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useUserRole } from '@/hooks/useUserRole';
import { useSequentialSelection } from '@/hooks/useSequentialSelection';
import { useSecondarySelection } from '@/hooks/useSecondarySelection';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { cn } from '@/lib/utils';
import { HostAssignmentForm, type HostAssignment } from '@/components/HostAssignmentForm';
import { parseDateOnly, calculateNights, toDateOnlyString, parseDateAtNoon } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';

// Use the imported parseDateAtNoon function for check-in/check-out times
const parseLocalDate = parseDateAtNoon;

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
  adminOverride?: boolean;
}

export function BookingForm({ open, onOpenChange, currentMonth, onBookingComplete, editingReservation, testOverrideMode = false, selectedStartDate, selectedEndDate, prefilledFamilyGroup, prefilledHost }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { familyGroups } = useFamilyGroups();
  const { isGroupLead, isGroupMember, isHost, isCalendarKeeper, userFamilyGroup, userHostInfo } = useUserRole();
  const { createReservation, updateReservation, deleteReservation, loading: reservationLoading } = useReservations();
  const { rotationData, getRotationForYear } = useRotationOrder();
  const { 
    calculateTimePeriodWindows, 
    validateBooking, 
    updateTimePeriodUsage,
    timePeriodUsage 
  } = useTimePeriods();
  const { getAllocationModel, isStaticWeeks } = useOrganizationContext();

  // Get user's family group name for legacy compatibility  
  const userFamilyGroupName = userFamilyGroup?.name;

  // Get current rotation order and determine whose turn it is
  const currentYear = currentMonth.getFullYear();
  const rotationOrder = getRotationForYear(currentYear);
  
  // Check secondary selection status to prevent regular bookings during user's turn
  const { isSecondaryRoundActive: isSecondaryActive, isCurrentFamilyTurn } = useSecondarySelection(currentYear);
  
  // Use the sequential selection system to determine current turn and check if secondary selection is active
  const { currentFamilyGroup, currentPhase } = useSequentialSelection(currentYear);
  const currentTurnGroup = currentFamilyGroup || rotationOrder[0];
  const isSecondarySelectionActive = currentPhase === 'secondary';

  // Filter family groups based on user role
  const availableFamilyGroups = testOverrideMode 
    ? familyGroups // Show all groups in test mode
    : isGroupMember
      ? familyGroups.filter(fg => fg.name === userFamilyGroupName) // Group members only see their group
      : familyGroups; // Group leads and calendar keepers can see all groups
  
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNoHostDialog, setShowNoHostDialog] = useState(false);

  const form = useForm<BookingFormData>({
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      familyGroup: '',
      totalCost: 0,
      hostAssignments: [],
      adminOverride: false
    }
  });

  // Populate form when editing
  useEffect(() => {
    console.log('=== BookingForm useEffect triggered ===', {
      editingReservation: editingReservation,
      editingReservationId: editingReservation?.id,
      hasEditingReservation: !!editingReservation
    });
    
    if (editingReservation) {
      console.log('=== Editing existing reservation ===', editingReservation);
      // Parse existing host assignments if available
      const existingAssignments = editingReservation.host_assignments || [];
      const parsedAssignments = Array.isArray(existingAssignments) ? 
        existingAssignments.map((assignment: any) => ({
          host_name: assignment.host_name || '',
          host_email: assignment.host_email || '',
          start_date: parseDateAtNoon(assignment.start_date),
          end_date: parseDateAtNoon(assignment.end_date)
        })) : [];

      form.reset({
        startDate: parseLocalDate(editingReservation.start_date),
        endDate: parseLocalDate(editingReservation.end_date),
        familyGroup: editingReservation.family_group,
        totalCost: editingReservation.total_cost || 0,
        hostAssignments: parsedAssignments
      });
    } else {
      console.log('=== Creating new reservation ===', {
        selectedStartDate,
        selectedEndDate,
        prefilledFamilyGroup,
        prefilledHost
      });
      // Use selected dates from calendar if provided, otherwise default to today at noon
      const defaultStartDate = selectedStartDate || (() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
      })();
      const defaultEndDate = selectedEndDate || (() => {
        const endDate = new Date();
        endDate.setHours(12, 0, 0, 0);
        return endDate;
      })();
      
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
        hostAssignments: defaultHostAssignments,
        adminOverride: false
      });
    }
  }, [editingReservation, form, selectedStartDate, selectedEndDate, isGroupMember, isHost, isGroupLead, isCalendarKeeper, userFamilyGroup, userHostInfo, prefilledFamilyGroup, prefilledHost, familyGroups]);

  const watchedStartDate = form.watch('startDate');
  const watchedEndDate = form.watch('endDate');
  const watchedFamilyGroup = form.watch('familyGroup');
  const watchedHostAssignments = form.watch('hostAssignments');
  const watchedAdminOverride = form.watch('adminOverride');

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

  // Calculate time period windows for the month of the selected dates (or editing reservation)
  // For bookings that might span month boundaries, calculate windows for both months
  const relevantMonth = selectedStartDate || (editingReservation ? parseLocalDate(editingReservation.start_date) : currentMonth);
  
  // Generate windows for the relevant month and the previous month to catch periods that span months
  const prevMonth = new Date(relevantMonth);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  
  const windowsCurrentMonth = calculateTimePeriodWindows(
    relevantMonth.getFullYear(),
    relevantMonth
  );
  const windowsPrevMonth = calculateTimePeriodWindows(
    prevMonth.getFullYear(),
    prevMonth
  );
  
  // Combine and deduplicate windows
  const timePeriodWindows = [...windowsPrevMonth, ...windowsCurrentMonth].filter((window, index, self) =>
    index === self.findIndex(w => 
      w.startDate.getTime() === window.startDate.getTime() &&
      w.endDate.getTime() === window.endDate.getTime()
    )
  );

  // Custom validation for edit mode
  const validateEditBooking = (startDate: Date, endDate: Date, familyGroup: string) => {
    const errors: string[] = [];
    
    if (!editingReservation) return { isValid: false, errors: ["No reservation to edit"] };
    
    // Only validate allocated period if the fields exist and are valid
    if (editingReservation.allocated_start_date && editingReservation.allocated_end_date) {
      const originalStart = parseDateOnly(editingReservation.allocated_start_date);
      const originalEnd = parseDateOnly(editingReservation.allocated_end_date);
      
      // Check if dates are valid (not epoch date)
      if (originalStart.getFullYear() > 1970 && originalEnd.getFullYear() > 1970) {
        if (startDate < originalStart) {
          errors.push(`Cannot move start date before original allocated period (${format(originalStart, "PPP")})`);
        }
        if (endDate > originalEnd) {
          errors.push(`Cannot extend end date beyond original allocated period (${format(originalEnd, "PPP")})`);
        }
      }
    }
    
    // Can't extend duration
    const originalDuration = calculateNights(editingReservation.start_date, editingReservation.end_date);
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
        : validateBooking(watchedStartDate, watchedEndDate, watchedFamilyGroup, timePeriodWindows, watchedAdminOverride, isSecondarySelectionActive)
    : { isValid: false, errors: [] };

  // Find the relevant time period window for the selected family group
  const relevantWindow = timePeriodWindows.find(window => 
    window.familyGroup === watchedFamilyGroup &&
    watchedStartDate >= window.startDate &&
    watchedEndDate <= window.endDate
  );

  // Check if family group can still make bookings
  const familyUsage = timePeriodUsage.find(u => u.family_group === watchedFamilyGroup);

  // Check if the family group can make a booking (considering admin override and all phases active)
  const allPhasesActive = rotationData?.enable_secondary_selection && rotationData?.enable_post_rotation_selection;
  const canMakeBooking = watchedAdminOverride || allPhasesActive || !familyUsage || familyUsage.time_periods_used < familyUsage.time_periods_allowed;

  const onSubmit = async (data: BookingFormData) => {
    // Check if no host is assigned and confirmation hasn't been given
    if (data.hostAssignments.length === 0 && !showNoHostDialog) {
      setShowNoHostDialog(true);
      return; // Stop submission and show dialog
    }

    // Prevent double submission
    if (submitting) {
      console.log('Submission already in progress, ignoring duplicate');
      return;
    }

    console.log('=== Form submission started ===', {
      familyGroup: data.familyGroup,
      startDate: data.startDate,
      endDate: data.endDate,
      isEditing: !!editingReservation
    });

    // Final validation - bypass in test mode
    const validation = testOverrideMode 
      ? { isValid: true, errors: [] } // Always valid in test mode
      : editingReservation 
        ? validateEditBooking(data.startDate, data.endDate, data.familyGroup)
        : validateBooking(data.startDate, data.endDate, data.familyGroup, timePeriodWindows, data.adminOverride, isSecondarySelectionActive);
    
    if (!validation.isValid) {
      console.log('Validation failed:', validation.errors);
      toast({
        title: editingReservation ? "Edit Invalid" : "Booking Invalid",
        description: validation.errors.join('. '),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log('Starting reservation creation/update...');
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
        }, testOverrideMode || data.adminOverride); // Pass override parameter

        if (updatedReservation) {
          console.log('Reservation updated successfully:', updatedReservation);
          toast({
            title: "Booking Updated",
            description: `Successfully updated booking for ${data.familyGroup}`,
          });

          form.reset();
          onOpenChange(false);
          onBookingComplete?.();
        } else {
          console.error('Update failed - no reservation returned');
        }
      } else {
        // Create new reservation
        // SAFETY CHECK: Use allocation model from organization context
        // This prevents static week logic from being applied to rotating selection orgs
        const allocationModel = getAllocationModel();
        
        // Consider it a time period booking ONLY if:
        // 1. Organization uses Static Weeks allocation model (not rotating selection)
        // 2. It's during their sequential selection turn
        // 3. They're booking a full week (7 nights)
        // 4. Admin hasn't overridden it as a manual booking
        const isTimePeriodBooking = 
          isStaticWeeks() &&
          !data.adminOverride &&
          data.familyGroup === currentTurnGroup && 
          nights === 7;

        // CRITICAL SAFETY CHECK: Block period booking if wrong allocation model
        if (isTimePeriodBooking && allocationModel !== 'static_weeks') {
          console.error('SAFETY BLOCK: Attempted period booking in', allocationModel, 'organization');
          toast({
            title: "Booking Error",
            description: "This organization uses rotating selection, not static weeks. Period booking is not available.",
            variant: "destructive"
          });
          return;
        }

        const hostAssignmentsData = data.hostAssignments.map(assignment => ({
          host_name: assignment.host_name,
          host_email: assignment.host_email,
          start_date: assignment.start_date.toISOString().split('T')[0],
          end_date: assignment.end_date.toISOString().split('T')[0]
        }));

        // Determine time_period_number based on booking context:
        // - For static weeks (isTimePeriodBooking): use period number
        // - For secondary selection phase: use -1 as marker
        // - For rotation primary or admin overrides: use null
        let timePeriodNumber = null;
        if (isTimePeriodBooking) {
          timePeriodNumber = 1; // Static week booking
        } else if (currentPhase === 'secondary') {
          timePeriodNumber = -1; // Secondary selection marker for rotation systems
        }

        const reservation = await createReservation({
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          family_group: data.familyGroup,
          total_cost: data.totalCost,
          allocated_start_date: isTimePeriodBooking ? data.startDate.toISOString().split('T')[0] : null,
          allocated_end_date: isTimePeriodBooking ? data.endDate.toISOString().split('T')[0] : null,
          time_period_number: timePeriodNumber,
          nights_used: nights,
          host_assignments: hostAssignmentsData
        }, testOverrideMode); // Pass testOverrideMode parameter

        if (reservation) {
          // Update time period usage for static weeks system only
          if (isTimePeriodBooking) {
            await updateTimePeriodUsage(data.familyGroup, data.startDate.getFullYear());
          }
          
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
      console.error('Error in form submission:', error);
      toast({
        title: editingReservation ? "Update Failed" : "Booking Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('Form submission complete, resetting submitting state');
      setSubmitting(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!editingReservation) return;
    
    const success = await deleteReservation(editingReservation.id);
    if (success) {
      setShowDeleteDialog(false);
      form.reset();
      onOpenChange(false);
      onBookingComplete?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingReservation ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        </DialogHeader>
        
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
                          disabled={(date) => !watchedAdminOverride && !testOverrideMode && date < new Date()}
                          defaultMonth={field.value}
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
                          defaultMonth={field.value}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              
              {editingReservation && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={submitting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={
                  !currentValidation.isValid || 
                  !canMakeBooking || 
                  submitting || 
                  reservationLoading
                }
              >
                {submitting ? 
                  (editingReservation ? "Updating Booking..." : "Creating Booking...") : 
                  (editingReservation ? "Update Booking" : "Confirm Booking")
                }
              </Button>
            </div>

            {/* Admin Override Checkbox - Only show for calendar keepers */}
            {(isCalendarKeeper || testOverrideMode) && (
              <FormField
                control={form.control}
                name="adminOverride"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        Override Time Period Limits
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {editingReservation 
                          ? "Allow updating past reservations and bypassing date restrictions"
                          : "Allow booking even if the family group has already used all allocated time periods for this year"
                        }
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}


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

            {!canMakeBooking && !watchedAdminOverride && !allPhasesActive && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  This family group has already used all allocated time periods for this year.
                  {(isCalendarKeeper || testOverrideMode) && (
                    <span className="block mt-2 text-muted-foreground">
                      Use the "Override Time Period Limits" option above to allow this booking.
                    </span>
                  )}
                </p>
              </div>
            )}

            {allPhasesActive && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary">
                  ℹ️ All selection phases (Primary, Secondary, and Post-Rotation) are active. Time period limits are not enforced.
                </p>
              </div>
            )}

            {/* No host assigned warning */}
            {watchedFamilyGroup && watchedStartDate && watchedEndDate && watchedHostAssignments.length === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ℹ️ No host assigned yet. Consider assigning a host using the "Primary Host" dropdown above to specify who will be responsible for this reservation.
                </p>
              </div>
            )}
            </form>
          </Form>
      </DialogContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reservation for{" "}
              <strong>{editingReservation?.family_group}</strong>?
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteReservation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No Host Confirmation Dialog */}
      <AlertDialog open={showNoHostDialog} onOpenChange={setShowNoHostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Primary Host Selected</AlertDialogTitle>
            <AlertDialogDescription>
              You haven't selected a Primary Host for this reservation. 
              The Primary Host is responsible for managing this stay.
              <br />
              <br />
              Are you sure you want to continue without assigning a host?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNoHostDialog(false)}>
              Go Back and Select Host
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowNoHostDialog(false);
              // Trigger actual submission by calling onSubmit with form data
              form.handleSubmit(onSubmit)();
            }}>
              Continue Without Host
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}