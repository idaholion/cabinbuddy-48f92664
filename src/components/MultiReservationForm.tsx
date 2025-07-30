import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Users, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MultiDateRangePicker, DateRange } from '@/components/ui/multi-date-range-picker';
import { useReservations } from '@/hooks/useEnhancedReservations';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

const multiReservationSchema = z.object({
  family_group: z.string().min(1, 'Please select a family group'),
  guest_count: z.number().min(1, 'Guest count must be at least 1').max(20, 'Guest count cannot exceed 20'),
  property_name: z.string().optional(),
  notes: z.string().optional(),
});

type MultiReservationFormData = z.infer<typeof multiReservationSchema>;

interface MultiReservationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MultiReservationForm = ({ onSuccess, onCancel }: MultiReservationFormProps) => {
  const [dateRanges, setDateRanges] = useState<DateRange[]>([]);
  const [conflictInfo, setConflictInfo] = useState<{ hasConflict: boolean; message?: string; conflictingReservations?: any[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { checkAvailability, createReservation } = useReservations();
  const { familyGroups } = useFamilyGroups();

  const form = useForm<MultiReservationFormData>({
    resolver: zodResolver(multiReservationSchema),
    defaultValues: {
      guest_count: 2,
      property_name: 'Main Cabin',
    },
  });

  const handleConflictCheck = async (ranges: DateRange[]) => {
    if (ranges.length === 0) {
      setConflictInfo(null);
      return { hasConflict: false };
    }

    try {
      const result = await checkAvailability(ranges);
      setConflictInfo(result);
      return result;
    } catch (error) {
      const errorResult = { hasConflict: true, message: 'Error checking availability' };
      setConflictInfo(errorResult);
      return errorResult;
    }
  };

  const calculateTotalNights = () => {
    return dateRanges.reduce((total, range) => {
      const nights = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
      return total + nights;
    }, 0);
  };

  const onSubmit = async (data: MultiReservationFormData) => {
    if (dateRanges.length === 0) {
      form.setError('root', { message: 'Please select at least one date range' });
      return;
    }

    if (conflictInfo?.hasConflict) {
      form.setError('root', { message: 'Please resolve date conflicts before submitting' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create reservations for each date range
      const reservationPromises = dateRanges.map((range, index) => {
        const nights = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
        
        return createReservation.mutateAsync({
          family_group: data.family_group,
          start_date: range.start.toISOString().split('T')[0],
          end_date: range.end.toISOString().split('T')[0],
          guest_count: data.guest_count,
          property_name: data.property_name,
          nights_used: nights,
          status: 'confirmed',
          time_period_number: index + 1,
        });
      });

      await Promise.all(reservationPromises);
      
      form.reset();
      setDateRanges([]);
      setConflictInfo(null);
      onSuccess?.();

    } catch (error) {
      form.setError('root', { 
        message: error instanceof Error ? error.message : 'Failed to create reservations' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalNights = calculateTotalNights();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Create Multiple Reservations</CardTitle>
        </div>
        <CardDescription>
          Book multiple date ranges in one go. Perfect for planning extended stays or multiple visits.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date Range Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Reservation Periods</label>
              <MultiDateRangePicker
                dateRanges={dateRanges}
                onDateRangesChange={setDateRanges}
                onConflictCheck={handleConflictCheck}
                placeholder="Select your reservation periods"
                maxRanges={5}
              />
              
              {totalNights > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Total: {totalNights} nights across {dateRanges.length} periods</span>
                </div>
              )}
            </div>

            {/* Conflict Warning */}
            {conflictInfo?.hasConflict && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {conflictInfo.message}
                  {conflictInfo.conflictingReservations && conflictInfo.conflictingReservations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {conflictInfo.conflictingReservations.map((res, idx) => (
                        <div key={idx} className="text-xs">
                          • {res.family_group}: {res.start_date} to {res.end_date}
                        </div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Family Group Selection */}
            <FormField
              control={form.control}
              name="family_group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Group</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select family group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {familyGroups.map((group) => (
                        <SelectItem key={group.id} value={group.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full border"
                              style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guest Count and Property */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guest_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Guests</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          className="pl-10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="Main Cabin" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Special requests, dietary requirements, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Error */}
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || conflictInfo?.hasConflict || dateRanges.length === 0}
                className="flex-1"
              >
                {isSubmitting ? 'Creating Reservations...' : `Create ${dateRanges.length} Reservation${dateRanges.length !== 1 ? 's' : ''}`}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};