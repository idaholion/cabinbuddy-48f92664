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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, User, Info, Calendar as CalendarListIcon, Edit3 } from 'lucide-react';
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

interface ReservationOption {
  id: string;
  start_date: string;
  end_date: string;
  host_name: string;
  host_email: string;
}

export function TradeRequestForm({ open, onOpenChange, onTradeComplete }: TradeRequestFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { familyGroups } = useFamilyGroups();
  const { activeOrganization } = useOrganizationContext();
  const { createTradeRequest, loading: tradeLoading } = useTradeRequests();
  
  const [submitting, setSubmitting] = useState(false);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [selectionMode, setSelectionMode] = useState<'browse' | 'manual'>('browse');
  const [availableReservations, setAvailableReservations] = useState<ReservationOption[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

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
  const watchedTargetFamilyGroup = form.watch('targetFamilyGroup');
  const watchedOfferedStartDate = form.watch('offeredStartDate');

  // Fetch available reservations when target family group changes
  useEffect(() => {
    const fetchReservations = async () => {
      if (!watchedTargetFamilyGroup || !activeOrganization) {
        setAvailableReservations([]);
        return;
      }

      setLoadingReservations(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: reservations, error } = await supabase
          .from('reservations')
          .select('id, start_date, end_date, host_assignments, family_group')
          .eq('organization_id', activeOrganization.organization_id)
          .eq('family_group', watchedTargetFamilyGroup)
          .gte('end_date', today)
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching reservations:', error);
          setAvailableReservations([]);
          return;
        }

        const options: ReservationOption[] = (reservations || []).map(res => {
          const hostAssignments = res.host_assignments as any[];
          const primaryHost = hostAssignments?.[0];
          
          // Get group lead as fallback
          const targetGroup = familyGroups.find(fg => fg.name === watchedTargetFamilyGroup);
          
          return {
            id: res.id,
            start_date: res.start_date,
            end_date: res.end_date,
            host_name: primaryHost?.name || res.family_group,
            host_email: primaryHost?.email || targetGroup?.lead_email || ''
          };
        });

        setAvailableReservations(options);
      } catch (error) {
        console.error('Error in fetchReservations:', error);
        setAvailableReservations([]);
      } finally {
        setLoadingReservations(false);
      }
    };

    fetchReservations();
    setSelectedReservationId(null);
    setHostInfo(null);
  }, [watchedTargetFamilyGroup, activeOrganization, familyGroups]);

  // Update form and host info when a reservation is selected
  useEffect(() => {
    if (selectedReservationId && selectionMode === 'browse') {
      const selectedRes = availableReservations.find(r => r.id === selectedReservationId);
      if (selectedRes) {
        form.setValue('requestedStartDate', new Date(selectedRes.start_date));
        form.setValue('requestedEndDate', new Date(selectedRes.end_date));
        setHostInfo({
          name: selectedRes.host_name,
          email: selectedRes.host_email
        });
      }
    }
  }, [selectedReservationId, selectionMode, availableReservations, form]);

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

            {/* Time Period Selection */}
            {watchedTargetFamilyGroup && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Time Period You Want</h4>
                  <Tabs value={selectionMode} onValueChange={(v) => {
                    setSelectionMode(v as 'browse' | 'manual');
                    setSelectedReservationId(null);
                    setHostInfo(null);
                  }} className="w-auto">
                    <TabsList className="h-8">
                      <TabsTrigger value="browse" className="text-xs px-2 h-6">
                        <CalendarListIcon className="h-3 w-3 mr-1" />
                        Browse
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="text-xs px-2 h-6">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Manual
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {selectionMode === 'browse' ? (
                  <div className="space-y-3">
                    {loadingReservations ? (
                      <p className="text-sm text-muted-foreground">Loading reservations...</p>
                    ) : availableReservations.length === 0 ? (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          No upcoming reservations found for {watchedTargetFamilyGroup}. 
                          Use manual date entry instead.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <RadioGroup 
                        value={selectedReservationId || ''} 
                        onValueChange={setSelectedReservationId}
                        className="space-y-2"
                      >
                        {availableReservations.map((res) => (
                          <div 
                            key={res.id} 
                            className={cn(
                              "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                              selectedReservationId === res.id 
                                ? "border-primary bg-primary/5" 
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => setSelectedReservationId(res.id)}
                          >
                            <RadioGroupItem value={res.id} id={res.id} />
                            <Label htmlFor={res.id} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(res.start_date), "MMM d")} - {format(new Date(res.end_date), "MMM d, yyyy")}
                                  </p>
                                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                                    <User className="h-3 w-3 mr-1" />
                                    Reserved by {res.host_name}
                                  </p>
                                </div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {/* Show selected host info */}
                    {selectedReservationId && hostInfo && (
                      <Alert className="bg-primary/10 border-primary/20 mt-3">
                        <User className="h-4 w-4" />
                        <AlertDescription>
                          Trade request will be sent to <strong>{hostInfo.name}</strong>.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  /* Manual Date Selection */
                  <div className="space-y-4">
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
                    
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Manual dates will be sent to the {watchedTargetFamilyGroup} group lead.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            )}

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