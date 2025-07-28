import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useForm, useFieldArray } from 'react-hook-form';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useMultiPeriodReservations, MultiPeriodReservationData } from '@/hooks/useMultiPeriodReservations';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MultiPeriodBookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: Date;
  onBookingComplete?: () => void;
}

interface FormData {
  familyGroup: string;
  guestCount: number;
  totalCost?: number;
  periods: {
    startDate: Date;
    endDate: Date;
    periodNumber: number;
  }[];
}

export function MultiPeriodBookingForm({ 
  open, 
  onOpenChange, 
  currentMonth, 
  onBookingComplete 
}: MultiPeriodBookingFormProps) {
  const { user } = useAuth();
  const { familyGroups } = useFamilyGroups();
  const { rotationData, getRotationForYear } = useRotationOrder();
  const { calculateTimePeriodWindows, timePeriodUsage } = useTimePeriods();
  const { 
    loading,
    validateMultiPeriodReservation,
    createMultiPeriodReservation,
    getFamilyGroupUsageSummary
  } = useMultiPeriodReservations();

  // Get user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email === user?.email)
  )?.name;

  const currentYear = currentMonth.getFullYear();
  const rotationOrder = getRotationForYear(currentYear);
  const timePeriodWindows = calculateTimePeriodWindows(currentYear, currentMonth);

  const form = useForm<FormData>({
    defaultValues: {
      familyGroup: userFamilyGroup || '',
      guestCount: 1,
      totalCost: 0,
      periods: [
        {
          startDate: new Date(),
          endDate: new Date(),
          periodNumber: 1
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "periods"
  });

  const watchedFamilyGroup = form.watch('familyGroup');
  const watchedPeriods = form.watch('periods');

  // Get available periods for the selected family group
  const availablePeriods = timePeriodWindows.filter(w => w.familyGroup === watchedFamilyGroup);
  const usageSummary = getFamilyGroupUsageSummary(watchedFamilyGroup, currentYear);

  // Validate current form state
  const currentValidation = watchedFamilyGroup && watchedPeriods.length > 0
    ? validateMultiPeriodReservation({
        periods: watchedPeriods.map(p => ({
          startDate: p.startDate,
          endDate: p.endDate,
          periodNumber: p.periodNumber,
          nights: Math.ceil((p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24))
        })),
        familyGroup: watchedFamilyGroup,
        guestCount: form.watch('guestCount')
      }, timePeriodWindows)
    : { isValid: false, errors: [] };

  const addPeriod = () => {
    const nextPeriodNumber = Math.max(...fields.map(f => f.periodNumber), 0) + 1;
    append({
      startDate: new Date(),
      endDate: new Date(),
      periodNumber: nextPeriodNumber
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!currentValidation.isValid) {
      return;
    }

    const reservationData: MultiPeriodReservationData = {
      periods: data.periods.map(p => ({
        startDate: p.startDate,
        endDate: p.endDate,
        periodNumber: p.periodNumber,
        nights: Math.ceil((p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24))
      })),
      familyGroup: data.familyGroup,
      guestCount: data.guestCount,
      totalCost: data.totalCost
    };

    const result = await createMultiPeriodReservation(reservationData);
    
    if (result) {
      form.reset();
      onOpenChange(false);
      onBookingComplete?.();
    }
  };

  const getTotalNights = () => {
    return watchedPeriods.reduce((total, period) => {
      if (period.startDate && period.endDate) {
        return total + Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return total;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Multi-Period Booking</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Book across multiple time periods to maximize your vacation time
          </p>
        </DialogHeader>

        {/* Usage Summary */}
        {watchedFamilyGroup && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Period Usage Summary - {watchedFamilyGroup}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="font-medium">Used:</span> {usageSummary.periodsUsed}
                </div>
                <div>
                  <span className="font-medium">Allowed:</span> {usageSummary.periodsAllowed}
                </div>
                <div>
                  <span className="font-medium">Remaining:</span> {usageSummary.periodsRemaining}
                </div>
                <Badge variant={usageSummary.canBookMorePeriods ? "default" : "destructive"}>
                  {usageSummary.canBookMorePeriods ? "Can Book More" : "Limit Reached"}
                </Badge>
              </div>
            </CardContent>
          </Card>
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
                    >
                      <option value="">Select Family Group</option>
                      {familyGroups.map((group) => (
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

            {/* Periods */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Booking Periods</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPeriod}
                  disabled={!usageSummary.canBookMorePeriods || fields.length >= usageSummary.periodsRemaining}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Period
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Period {index + 1}</CardTitle>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Period Number Selection */}
                    <FormField
                      control={form.control}
                      name={`periods.${index}.periodNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Period</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              className="w-full p-2 border rounded-md bg-background"
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            >
                              <option value="">Select Period</option>
                              {availablePeriods.map((period) => (
                                <option key={period.periodNumber} value={period.periodNumber}>
                                  Period {period.periodNumber} ({format(period.startDate, "MMM d")} - {format(period.endDate, "MMM d")})
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
                        name={`periods.${index}.startDate`}
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
                        name={`periods.${index}.endDate`}
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
                                  disabled={(date) => date <= watchedPeriods[index]?.startDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Periods:</span> {fields.length}
                  </div>
                  <div>
                    <span className="font-medium">Total Nights:</span> {getTotalNights()}
                  </div>
                  <div>
                    <span className="font-medium">Guest Count:</span> {form.watch('guestCount')}
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!currentValidation.isValid || loading}
              >
                {loading ? 'Creating...' : 'Book All Periods'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}