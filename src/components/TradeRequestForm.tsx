import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, User, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useTradeRequests } from '@/hooks/useTradeRequests';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TradeRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTradeComplete?: () => void;
}

interface TradeFormData {
  targetFamilyGroup: string;
  requestedStartDate: Date;
  requestedEndDate: Date;
  offeredStartDate?: Date;
  offeredEndDate?: Date;
  isTradeOffer: boolean;
  message: string;
}

interface HostInfo {
  name: string;
  email: string;
}

export function TradeRequestForm({ open, onOpenChange, onTradeComplete }: TradeRequestFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { familyGroups } = useFamilyGroups();
  const { activeOrganization } = useOrganizationContext();
  const { createTradeRequest, loading: tradeLoading } = useTradeRequests();
  
  const [submitting, setSubmitting] = useState(false);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [lookingUpHost, setLookingUpHost] = useState(false);

  // Get user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email?.toLowerCase() === user?.email?.toLowerCase())
  )?.name;

  // Filter out user's own family group from target options
  const availableTargetGroups = familyGroups.filter(fg => fg.name !== userFamilyGroup);

  const form = useForm<TradeFormData>({
    defaultValues: {
      targetFamilyGroup: '',
      requestedStartDate: new Date(),
      requestedEndDate: new Date(),
      offeredStartDate: undefined,
      offeredEndDate: undefined,
      isTradeOffer: false,
      message: ''
    }
  });

  const watchedIsTradeOffer = form.watch('isTradeOffer');
  const watchedRequestedStartDate = form.watch('requestedStartDate');
  const watchedRequestedEndDate = form.watch('requestedEndDate');
  const watchedTargetFamilyGroup = form.watch('targetFamilyGroup');
  const watchedOfferedStartDate = form.watch('offeredStartDate');

  // Look up the host for the selected dates and family group
  useEffect(() => {
    const lookupHost = async () => {
      if (!watchedTargetFamilyGroup || !watchedRequestedStartDate || !watchedRequestedEndDate || !activeOrganization) {
        setHostInfo(null);
        return;
      }

      setLookingUpHost(true);
      try {
        const startDate = watchedRequestedStartDate.toISOString().split('T')[0];
        const endDate = watchedRequestedEndDate.toISOString().split('T')[0];

        // Find reservations that overlap with the requested dates
        const { data: reservations, error } = await supabase
          .from('reservations')
          .select('host_assignments, family_group')
          .eq('organization_id', activeOrganization.organization_id)
          .eq('family_group', watchedTargetFamilyGroup)
          .lte('start_date', endDate)
          .gte('end_date', startDate)
          .order('start_date', { ascending: true })
          .limit(1);

        if (error) {
          console.error('Error looking up reservation:', error);
          setHostInfo(null);
          return;
        }

        if (reservations && reservations.length > 0) {
          const reservation = reservations[0];
          const hostAssignments = reservation.host_assignments as any[];
          
          if (hostAssignments && hostAssignments.length > 0) {
            const primaryHost = hostAssignments[0];
            setHostInfo({
              name: primaryHost.name || reservation.family_group,
              email: primaryHost.email || ''
            });
          } else {
            // Fall back to family group lead
            const targetGroup = familyGroups.find(fg => fg.name === watchedTargetFamilyGroup);
            if (targetGroup?.lead_email) {
              setHostInfo({
                name: targetGroup.name,
                email: targetGroup.lead_email
              });
            } else {
              setHostInfo(null);
            }
          }
        } else {
          // No reservation found - will notify group lead
          setHostInfo(null);
        }
      } catch (error) {
        console.error('Error in host lookup:', error);
        setHostInfo(null);
      } finally {
        setLookingUpHost(false);
      }
    };

    lookupHost();
  }, [watchedTargetFamilyGroup, watchedRequestedStartDate, watchedRequestedEndDate, activeOrganization, familyGroups]);

  const onSubmit = async (data: TradeFormData) => {
    if (!userFamilyGroup) {
      toast({
        title: "Error",
        description: "Unable to determine your family group.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const tradeData = {
        target_family_group: data.targetFamilyGroup,
        requested_start_date: data.requestedStartDate.toISOString().split('T')[0],
        requested_end_date: data.requestedEndDate.toISOString().split('T')[0],
        request_type: data.isTradeOffer ? 'trade_offer' as const : 'request_only' as const,
        requester_message: data.message,
        // Include host info if available
        ...(hostInfo?.email && { target_host_email: hostInfo.email }),
        ...(hostInfo?.name && { target_host_name: hostInfo.name }),
        ...(data.isTradeOffer && data.offeredStartDate && data.offeredEndDate && {
          offered_start_date: data.offeredStartDate.toISOString().split('T')[0],
          offered_end_date: data.offeredEndDate.toISOString().split('T')[0],
        })
      };

      const result = await createTradeRequest(tradeData, userFamilyGroup);

      if (result) {
        // Send notification email
        try {
          await supabase.functions.invoke('send-trade-notification', {
            body: {
              tradeRequestId: result.id,
              notificationType: 'request_created'
            }
          });
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
          // Don't fail the whole request if email fails
        }

        form.reset();
        onOpenChange(false);
        onTradeComplete?.();
      }
    } catch (error) {
      console.error('Trade request submission error:', error);
      toast({
        title: "Request Failed",
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
          <DialogTitle>Request Time Trade</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Target Family Group */}
            <FormField
              control={form.control}
              name="targetFamilyGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Group to Request From</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select family group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border border-border z-50">
                      {availableTargetGroups.map((group) => (
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

            {/* Requested Time Period */}
            <div className="space-y-4">
              <h4 className="font-medium">Time Period You Want</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requestedStartDate"
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
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestedEndDate"
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
                            disabled={(date) => date <= watchedRequestedStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Host Info Display */}
              {watchedTargetFamilyGroup && watchedRequestedStartDate && watchedRequestedEndDate && (
                <div className="mt-4">
                  {lookingUpHost ? (
                    <p className="text-sm text-muted-foreground">Looking up reservation holder...</p>
                  ) : hostInfo ? (
                    <Alert className="bg-primary/10 border-primary/20">
                      <User className="h-4 w-4" />
                      <AlertDescription>
                        This time is reserved by <strong>{hostInfo.name}</strong>. 
                        They will receive the trade request directly.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No specific reservation found for these dates. 
                        The request will be sent to the {watchedTargetFamilyGroup} group lead.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Trade Offer Toggle */}
            <FormField
              control={form.control}
              name="isTradeOffer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Offer Time in Return
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Toggle if you want to offer some of your time in exchange
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Offered Time Period (conditional) */}
            {watchedIsTradeOffer && (
              <div className="space-y-4">
                <h4 className="font-medium">Time Period You're Offering</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="offeredStartDate"
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
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="offeredEndDate"
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
                              disabled={(date) => !watchedOfferedStartDate || date <= watchedOfferedStartDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add a message to explain your request..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={submitting || tradeLoading}
              >
                {submitting ? "Sending Request..." : "Send Trade Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}