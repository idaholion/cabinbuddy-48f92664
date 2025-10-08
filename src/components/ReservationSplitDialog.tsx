import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useForm, useFieldArray } from 'react-hook-form';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useMultiPeriodReservations } from '@/hooks/useMultiPeriodReservations';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseDateOnly, calculateNights } from '@/lib/date-utils';

interface ReservationSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    start_date: string;
    end_date: string;
    family_group: string;
    guest_count: number;
    total_cost?: number;
    allocated_start_date?: string;
    allocated_end_date?: string;
  } | null;
  onSplitComplete?: () => void;
}

interface FormData {
  periods: {
    startDate: Date;
    endDate: Date;
    periodNumber: number;
  }[];
}

export function ReservationSplitDialog({ 
  open, 
  onOpenChange, 
  reservation, 
  onSplitComplete 
}: ReservationSplitDialogProps) {
  const { calculateTimePeriodWindows } = useTimePeriods();
  const { loading, splitReservation } = useMultiPeriodReservations();

  const form = useForm<FormData>({
    defaultValues: {
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

  // Get available time periods for the family group
  const currentYear = new Date().getFullYear();
  const timePeriodWindows = calculateTimePeriodWindows(currentYear, new Date());
  const availablePeriods = reservation ? 
    timePeriodWindows.filter(w => w.familyGroup === reservation.family_group) : 
    [];

  // Set initial form values when reservation changes
  useEffect(() => {
    if (reservation) {
      form.reset({
        periods: [
          {
            startDate: parseDateOnly(reservation.start_date),
            endDate: parseDateOnly(reservation.end_date),
            periodNumber: 1
          }
        ]
      });
    }
  }, [reservation, form]);

  const addPeriod = () => {
    const nextPeriodNumber = Math.max(...fields.map(f => f.periodNumber), 0) + 1;
    append({
      startDate: new Date(),
      endDate: new Date(),
      periodNumber: nextPeriodNumber
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!reservation) return;

    const periods = data.periods.map(p => ({
      startDate: p.startDate,
      endDate: p.endDate,
      periodNumber: p.periodNumber,
      nights: Math.ceil((p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24))
    }));

    const result = await splitReservation(reservation.id, periods);
    
    if (result) {
      onOpenChange(false);
      onSplitComplete?.();
    }
  };

  const getTotalNights = () => {
    const watchedPeriods = form.watch('periods');
    return watchedPeriods.reduce((total, period) => {
      if (period.startDate && period.endDate) {
        return total + Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return total;
    }, 0);
  };

  const originalNights = reservation ? 
    calculateNights(reservation.start_date, reservation.end_date) : 
    0;

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Reservation</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Split your reservation across multiple time periods
          </p>
        </DialogHeader>

        {/* Original Reservation Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Original Reservation</CardTitle>
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
                <span className="font-medium">Check-in:</span> {format(parseDateOnly(reservation.start_date), "PPP")}
              </div>
              <div>
                <span className="font-medium">Check-out:</span> {format(parseDateOnly(reservation.end_date), "PPP")}
              </div>
              <div>
                <span className="font-medium">Total Nights:</span> {originalNights}
              </div>
              <div>
                <span className="font-medium">Total Cost:</span> {reservation.total_cost ? `$${reservation.total_cost}` : 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* New Periods */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">New Periods</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPeriod}
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
                                  disabled={(date) => {
                                    const watchedPeriods = form.watch('periods');
                                    return date <= watchedPeriods[index]?.startDate;
                                  }}
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

            {/* Split Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Split Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Original Nights:</span> {originalNights}
                  </div>
                  <div>
                    <span className="font-medium">New Total Nights:</span> {getTotalNights()}
                  </div>
                  <div>
                    <span className="font-medium">New Periods:</span> {fields.length}
                  </div>
                </div>
                {getTotalNights() !== originalNights && (
                  <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Warning: Total nights changed from {originalNights} to {getTotalNights()}
                  </div>
                )}
              </CardContent>
            </Card>

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
                variant="destructive"
                disabled={loading || fields.length === 0}
              >
                {loading ? 'Splitting...' : 'Split Reservation'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}