import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, Users, ArrowRight } from 'lucide-react';
import { format, isAfter, isSameDay } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useReservations } from '@/hooks/useReservations';
import { useTradeRequests } from '@/hooks/useTradeRequests';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { parseDateOnly, calculateNights } from '@/lib/date-utils';

interface EarlyCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    start_date: string;
    end_date: string;
    family_group: string;
    guest_count: number;
    total_cost?: number;
    property_name?: string;
  } | null;
  onComplete?: () => void;
  isPreviewMode?: boolean;
}

interface FormData {
  action: 'cancel' | 'transfer_family' | 'offer_other';
  familyMember?: string;
  otherFamilyGroup?: string;
  newEndDate: Date;
  message?: string;
}

export function EarlyCheckoutDialog({ 
  open, 
  onOpenChange, 
  reservation, 
  onComplete,
  isPreviewMode = false
}: EarlyCheckoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateReservation, deleteReservation, loading: reservationLoading, createReservation } = useReservations();
  const { createTradeRequest, loading: tradeLoading } = useTradeRequests();
  const { familyGroups } = useFamilyGroups();
  
  const [submitting, setSubmitting] = useState(false);

  // Get user's family group and members
  const userFamilyGroup = familyGroups.find(fg => fg.name === reservation?.family_group);
  const familyMembers = userFamilyGroup?.host_members as any[] || [];
  
  // Filter out user's own family group from target options
  const otherFamilyGroups = familyGroups.filter(fg => fg.name !== reservation?.family_group);

  const form = useForm<FormData>({
    defaultValues: {
      action: 'cancel',
      newEndDate: new Date(),
      message: ''
    }
  });

  const watchedAction = form.watch('action');
  const watchedNewEndDate = form.watch('newEndDate');

  // Set initial new end date to today when dialog opens
  useEffect(() => {
    if (open && reservation) {
      const today = new Date();
      form.setValue('newEndDate', today);
    }
  }, [open, reservation, form]);

  const calculateRemainingNights = () => {
    if (!reservation || !watchedNewEndDate) return 0;
    const originalEndDate = parseDateOnly(reservation.end_date);
    const timeDiff = originalEndDate.getTime() - watchedNewEndDate.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  };

  const calculateStayedNights = () => {
    if (!reservation || !watchedNewEndDate) return 0;
    const startDate = parseDateOnly(reservation.start_date);
    const timeDiff = watchedNewEndDate.getTime() - startDate.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  };

  const onSubmit = async (data: FormData) => {
    if (!reservation) return;

    setSubmitting(true);
    try {
      const newEndDateString = data.newEndDate.toISOString().split('T')[0];

      switch (data.action) {
        case 'cancel':
          // Update reservation to end early (shortens the reservation)
          await updateReservation(reservation.id, {
            end_date: newEndDateString
          });
          toast({
            title: "Success",
            description: `Reservation shortened. Check-out updated to ${format(data.newEndDate, "PPP")}.`
          });
          break;

        case 'transfer_family':
          if (!data.familyMember) {
            toast({
              title: "Error",
              description: "Please select a family member.",
              variant: "destructive"
            });
            return;
          }
          
          // Update original reservation to end early and mark as transferred
          await updateReservation(reservation.id, {
            end_date: newEndDateString,
            transfer_type: 'transferred_out',
            transferred_to: data.familyMember
          });
          
          // Create continuation reservation for family member
          const continuationStartDate = new Date(data.newEndDate);
          continuationStartDate.setDate(continuationStartDate.getDate() + 1);
          
          const continuationData = {
            start_date: continuationStartDate.toISOString().split('T')[0],
            end_date: reservation.end_date,
            family_group: reservation.family_group,
            guest_count: reservation.guest_count,
            total_cost: 0, // Will be calculated separately
            property_name: reservation.property_name || 'Main Property',
            status: 'confirmed',
            original_reservation_id: reservation.id,
            transfer_type: 'transferred_in',
            transferred_from: user?.email || 'Unknown',
            host_assignments: [{
              host_name: data.familyMember,
              host_email: userFamilyGroup?.host_members?.find((m: any) => m.name === data.familyMember)?.email || ''
            }]
          };
          
          const continuationReservation = await createReservation(continuationData);
          
          if (continuationReservation) {
            toast({
              title: "Success",
              description: `Reservation split successfully. ${data.familyMember} now has a reservation for the remaining ${calculateRemainingNights()} nights.`
            });
          } else {
            toast({
              title: "Warning",
              description: "Original reservation updated but failed to create continuation reservation. Please contact support.",
              variant: "destructive"
            });
          }
          break;

        case 'offer_other':
          if (!data.otherFamilyGroup) {
            toast({
              title: "Error", 
              description: "Please select a family group.",
              variant: "destructive"
            });
            return;
          }

          // First, update reservation to end early
          await updateReservation(reservation.id, {
            end_date: newEndDateString
          });

          // Create trade request for the remaining time
          const remainingStartDate = new Date(data.newEndDate);
          remainingStartDate.setDate(remainingStartDate.getDate() + 1); // Day after early checkout
          
          const tradeData = {
            target_family_group: data.otherFamilyGroup,
            requested_start_date: remainingStartDate.toISOString().split('T')[0],
            requested_end_date: reservation.end_date,
            request_type: 'request_only' as const,
            requester_message: data.message || `Early checkout - offering remaining ${calculateRemainingNights()} nights`
          };

          const tradeResult = await createTradeRequest(tradeData, reservation.family_group);
          
          if (tradeResult) {
            // Send notification
            try {
              await supabase.functions.invoke('send-trade-notification', {
                body: {
                  tradeRequestId: tradeResult.id,
                  notificationType: 'request_created'
                }
              });
            } catch (emailError) {
              console.error('Failed to send notification:', emailError);
            }
          }

          toast({
            title: "Success",
            description: `Early checkout processed and remaining time offered to ${data.otherFamilyGroup}.`
          });
          break;
      }

      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Early checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to process early checkout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!reservation) return null;

  const today = new Date();
  const originalEndDate = parseDateOnly(reservation.end_date);
  const canCheckoutEarly = isAfter(originalEndDate, today);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Early Checkout
            {isPreviewMode && <span className="text-muted-foreground font-normal text-sm ml-2">(Sample Only)</span>}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Leave early and manage your remaining reservation time
          </p>
        </DialogHeader>

        {!canCheckoutEarly ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold">Cannot Check Out Early</h3>
                <p className="text-muted-foreground">
                  Your reservation ends today or has already ended.
                </p>
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Current Reservation Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Current Reservation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Family Group:</span> {reservation.family_group}
                  </div>
                  <div>
                    <span className="font-medium">Guests:</span> {reservation.guest_count}
                  </div>
                  <div>
                    <span className="font-medium">Original Check-out:</span> {format(originalEndDate, "PPP")}
                  </div>
                  <div>
                    <span className="font-medium">Total Cost:</span> {reservation.total_cost ? `$${reservation.total_cost}` : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* New Checkout Date */}
                <FormField
                  control={form.control}
                  name="newEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>New Check-out Date</FormLabel>
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
                            disabled={(date) => 
                              date < today || 
                              date >= originalEndDate ||
                              isSameDay(date, originalEndDate)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Impact Summary */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Nights stayed:</span>
                        <span className="font-medium">{calculateStayedNights()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining nights:</span>
                        <span className="font-medium text-orange-600">{calculateRemainingNights()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Selection */}
                <FormField
                  control={form.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you like to do with the remaining time?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cancel">
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Cancel remaining days (make available to others)
                            </div>
                          </SelectItem>
                          <SelectItem value="transfer_family">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Transfer to family member
                            </div>
                          </SelectItem>
                          <SelectItem value="offer_other">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              Offer to another family group
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional Fields Based on Action */}
                {watchedAction === 'transfer_family' && (
                  <>
                    <FormField
                      control={form.control}
                      name="familyMember"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Family Member</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose family member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {familyMembers.map((member, index) => (
                                <SelectItem key={index} value={member.name}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Checkout Responsibility Notice */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Checkout Responsibility Transfer
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                             The selected family member will be responsible for completing the departure checklist 
                             and final checkout process when they leave. They can access the departure checklist 
                             from the cabin menu.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {watchedAction === 'offer_other' && (
                  <>
                    <FormField
                      control={form.control}
                      name="otherFamilyGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Family Group</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose family group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {otherFamilyGroups.map((group) => (
                                <SelectItem key={group.id} value={group.name}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add a message explaining the offer..."
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
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
                    disabled={submitting || reservationLoading || tradeLoading || isPreviewMode}
                  >
                    {isPreviewMode ? "Preview Only" : submitting ? "Processing..." : "Confirm Early Checkout"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}