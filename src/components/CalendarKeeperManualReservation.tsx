import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useReservations } from '@/hooks/useReservations';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import { HostAssignmentForm, type HostAssignment } from '@/components/HostAssignmentForm';

interface ManualReservationFormData {
  startDate: Date;
  endDate: Date;
  familyGroup: string;
  guestCount: number;
  totalCost?: number;
  hostAssignments: HostAssignment[];
  notes?: string;
}

interface CalendarKeeperManualReservationProps {
  onReservationCreated?: () => void;
}

export function CalendarKeeperManualReservation({ onReservationCreated }: CalendarKeeperManualReservationProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { createReservation, loading: reservationLoading } = useReservations();
  
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ManualReservationFormData>({
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      familyGroup: '',
      guestCount: 1,
      totalCost: 0,
      hostAssignments: [],
      notes: ''
    }
  });

  const watchedStartDate = form.watch('startDate');
  const watchedEndDate = form.watch('endDate');
  const watchedFamilyGroup = form.watch('familyGroup');

  // Get the selected family group's host members
  const selectedFamilyGroup = familyGroups.find(fg => fg.name === watchedFamilyGroup);
  const familyGroupHosts = selectedFamilyGroup?.host_members || [];

  const onSubmit = async (data: ManualReservationFormData) => {
    // Basic validation
    if (data.startDate >= data.endDate) {
      toast({
        title: "Invalid Dates",
        description: "Check-out date must be after check-in date",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const nights = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
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
        guest_count: data.guestCount,
        total_cost: data.totalCost,
        nights_used: nights,
        host_assignments: hostAssignmentsData,
        status: 'confirmed' // Manual reservations are automatically confirmed
      });

      if (reservation) {
        toast({
          title: "Manual Reservation Created",
          description: `Successfully created ${nights} night reservation for ${data.familyGroup}`,
        });

        form.reset();
        setOpen(false);
        onReservationCreated?.();
      }
    } catch (error) {
      console.error('Manual reservation creation error:', error);
      toast({
        title: "Reservation Failed",
        description: "Failed to create manual reservation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Calendar Keeper Tools
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Manual Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manual Reservation</DialogTitle>
              <DialogDescription>
                As a calendar keeper, you can create reservations for any family group outside the normal rotation process.
              </DialogDescription>
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Family Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {familyGroups.map((group) => (
                              <SelectItem key={group.id} value={group.name}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                {/* Total Cost */}
                <FormField
                  control={form.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Cost (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Additional notes about this reservation"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Host Assignments */}
                {familyGroupHosts.length > 0 && (
                  <FormField
                    control={form.control}
                    name="hostAssignments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host Assignments (optional)</FormLabel>
                        <FormControl>
                          <HostAssignmentForm
                            familyGroupHosts={familyGroupHosts}
                            value={field.value}
                            onChange={field.onChange}
                            reservationStartDate={watchedStartDate}
                            reservationEndDate={watchedEndDate}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Manual Override Notice */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <UserCog className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Manual Override</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        This reservation bypasses rotation rules and will be automatically confirmed. 
                        It will not count against the family group's rotation period limits.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting || reservationLoading}
                  >
                    {submitting ? "Creating..." : "Create Reservation"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <div className="mt-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Calendar Keeper Privileges:</p>
          <ul className="space-y-0.5 text-xs">
            <li>• Create reservations for any family group</li>
            <li>• Override rotation order restrictions</li>
            <li>• Book dates outside normal time periods</li>
            <li>• Manage post-rotation open bookings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}