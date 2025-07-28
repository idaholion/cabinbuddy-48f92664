import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useTradeRequests } from '@/hooks/useTradeRequests';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
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

export function TradeRequestForm({ open, onOpenChange, onTradeComplete }: TradeRequestFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { familyGroups } = useFamilyGroups();
  const { createTradeRequest, loading: tradeLoading } = useTradeRequests();
  
  const [submitting, setSubmitting] = useState(false);

  // Get user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email === user?.email)
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
  const watchedOfferedStartDate = form.watch('offeredStartDate');

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
        ...(data.isTradeOffer && data.offeredStartDate && data.offeredEndDate && {
          offered_start_date: data.offeredStartDate.toISOString().split('T')[0],
          offered_end_date: data.offeredEndDate.toISOString().split('T')[0],
        })
      };

      const result = await createTradeRequest(tradeData, userFamilyGroup);

      if (result) {
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