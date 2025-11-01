import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useAuth } from '@/contexts/AuthContext';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useSequentialSelection } from '@/hooks/useSequentialSelection';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HostAssignmentForm, type HostAssignment } from '@/components/HostAssignmentForm';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

interface SecondarySelectionBookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: Date;
  onBookingComplete?: () => void;
  familyGroup: string;
}

interface SecondaryFormData {
  startDate: Date;
  endDate: Date;
  guestCount: number;
  hostAssignments: HostAssignment[];
}

export function SecondarySelectionBookingForm({ 
  open, 
  onOpenChange, 
  currentMonth, 
  onBookingComplete,
  familyGroup 
}: SecondarySelectionBookingFormProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { rotationData, getRotationForYear } = useRotationOrder();
  
  // Use rotation year logic to get the correct year (same as SecondarySelectionManager)
  const today = new Date();
  const currentYear = today.getFullYear();
  const startMonth = 9; // October (0-indexed)
  const rotationStartThisYear = new Date(currentYear, startMonth, 1);
  const hasPassedStartDate = today >= rotationStartThisYear;
  const rotationYear = hasPassedStartDate ? currentYear + 1 : currentYear;
  
  const { calculateTimePeriodWindows, timePeriodUsage, fetchTimePeriodUsage } = useTimePeriods(rotationYear);
  const { currentPhase, currentFamilyGroup } = useSequentialSelection(rotationYear);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState<any[]>([]);

  const form = useForm<SecondaryFormData>({
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      guestCount: 1,
      hostAssignments: []
    }
  });

  const monthYear = currentMonth.getFullYear();
  const rotationOrder = getRotationForYear(monthYear);
  const timePeriodWindows = calculateTimePeriodWindows(monthYear, currentMonth);

  // Get family group's current usage
  const familyUsage = timePeriodUsage.find(u => u.family_group === familyGroup);
  const remainingSecondaryPeriods = rotationData ? 
    (rotationData.secondary_max_periods || 1) - (familyUsage?.secondary_periods_used || 0) : 0;

  // Calculate available periods for secondary selection
  useEffect(() => {
    if (!timePeriodWindows.length || !familyGroup) return;

    // Filter periods that are still available for secondary selection
    const available = timePeriodWindows.filter(window => {
      // Must be unbooked
      if (!window.available) return false;
      
      // Must not be in family's primary allocation
      if (window.family_group === familyGroup) return false;
      
      // Check if period is already used by someone else in secondary
      const isSecondaryTaken = timePeriodUsage.some(usage => 
        usage.family_group !== familyGroup && 
        usage.secondary_periods_used > 0
      );
      
      return true;
    });

    setAvailablePeriods(available);
  }, [timePeriodWindows, familyGroup, timePeriodUsage]);

  const isCurrentFamilyTurn = () => {
    return currentFamilyGroup === familyGroup;
  };

  const onSubmit = async (data: SecondaryFormData) => {
    if (!user || !organization?.id || !familyGroup) return;
    
    setLoading(true);
    try {
      // Create the reservation
      const { error: reservationError } = await supabase
        .from('reservations')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          family_group: familyGroup,
          start_date: format(data.startDate, 'yyyy-MM-dd'),
          end_date: format(data.endDate, 'yyyy-MM-dd'),
          guest_count: data.guestCount,
          host_assignments: data.hostAssignments as any,
          status: 'confirmed',
          time_period_number: null // Secondary selections have no period number
        });

      if (reservationError) throw reservationError;

      // Update secondary period usage
      await updateSecondaryTimePeriodUsage(familyGroup, rotationYear);

      // Move to next family in secondary selection order
      await advanceSecondarySelection();

      toast({
        title: "Secondary Selection Complete",
        description: "Your additional time period has been booked successfully.",
      });

      form.reset();
      onBookingComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating secondary reservation:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error creating your secondary reservation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSecondaryTimePeriodUsage = async (familyGroup: string, year: number) => {
    if (!organization?.id) return;

    const { error } = await supabase
      .from('time_period_usage')
      .update({ 
        secondary_periods_used: (familyUsage?.secondary_periods_used || 0) + 1,
        selection_round: 'secondary',
        last_selection_date: new Date().toISOString()
      })
      .eq('organization_id', organization.id)
      .eq('family_group', familyGroup)
      .eq('rotation_year', year);

    if (error) {
      console.error('Error updating secondary usage:', error);
      throw error;
    }
    
    // Refresh time period usage to get latest data
    await fetchTimePeriodUsage(year);
  };

  const advanceSecondarySelection = async () => {
    if (!organization?.id || !rotationOrder.length || !currentFamilyGroup) return;

    // Get reverse order for secondary selection
    const reverseOrder = [...rotationOrder].reverse();
    const currentIndex = reverseOrder.findIndex(group => group === familyGroup);
    const nextIndex = (currentIndex + 1) % reverseOrder.length;
    const nextFamily = reverseOrder[nextIndex];

    // Check if next family has remaining secondary periods
    const nextFamilyUsage = timePeriodUsage.find(u => u.family_group === nextFamily);
    const nextFamilyRemaining = rotationData ? 
      (rotationData.secondary_max_periods || 1) - (nextFamilyUsage?.secondary_periods_used || 0) : 0;

    if (nextFamilyRemaining > 0) {
      // Update secondary selection status to next family
      const { error } = await supabase
        .from('secondary_selection_status')
        .update({
          current_family_group: nextFamily,
          current_group_index: nextIndex,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organization.id)
        .eq('rotation_year', monthYear);

      if (error) {
        console.error('Error advancing secondary selection:', error);
      }
    }
  };

  if (!isCurrentFamilyTurn()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Secondary Selection
            </DialogTitle>
          </DialogHeader>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              It's not your turn for secondary selection yet. 
              {currentFamilyGroup && (
                <> Currently: <strong>{currentFamilyGroup}</strong></>
              )}
            </AlertDescription>
          </Alert>
          
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (remainingSecondaryPeriods <= 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Secondary Selection Complete</DialogTitle>
          </DialogHeader>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have already used all of your secondary selection periods for this year.
            </AlertDescription>
          </Alert>
          
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Secondary Selection - {familyGroup}
          </DialogTitle>
        </DialogHeader>

        {/* Usage Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Secondary Selection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Remaining secondary periods:</span>
              <Badge variant="secondary">{remainingSecondaryPeriods}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Selection follows reverse order from primary round
            </div>
          </CardContent>
        </Card>

        {availablePeriods.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No available periods for secondary selection at this time.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Available Periods */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Available Periods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availablePeriods.map((period, index) => (
                      <div 
                        key={index}
                        className="p-2 border rounded-lg text-xs"
                      >
                        <div className="font-medium">
                          {format(period.start_date, 'MMM d')} - {format(period.end_date, 'MMM d')}
                        </div>
                        <div className="text-muted-foreground">
                          Period {period.period_number}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
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
                      <FormLabel>End Date</FormLabel>
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
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Host Assignment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Host Assignments</label>
                <div className="text-xs text-muted-foreground">
                  Host assignments will be configured after booking confirmation.
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Booking..." : "Book Secondary Period"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}