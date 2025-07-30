import React, { useState } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { CalendarIcon, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface DateRange {
  start: Date;
  end: Date;
}

interface MultiDateRangePickerProps {
  dateRanges: DateRange[];
  onDateRangesChange: (ranges: DateRange[]) => void;
  onConflictCheck?: (ranges: DateRange[]) => Promise<{ hasConflict: boolean; message?: string }>;
  disabledDates?: Date[];
  placeholder?: string;
  className?: string;
  maxRanges?: number;
}

export const MultiDateRangePicker = ({
  dateRanges,
  onDateRangesChange,
  onConflictCheck,
  disabledDates = [],
  placeholder = "Select date ranges",
  className,
  maxRanges = 5,
}: MultiDateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRange, setCurrentRange] = useState<{ start?: Date; end?: Date }>({});
  const [isChecking, setIsChecking] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    if (!currentRange.start) {
      // Starting a new range
      setCurrentRange({ start: date });
      setConflictMessage(null);
    } else if (!currentRange.end) {
      // Completing the range
      const start = currentRange.start;
      const end = date;
      
      // Ensure start is before end
      const newRange: DateRange = {
        start: start <= end ? start : end,
        end: start <= end ? end : start,
      };

      // Check for conflicts if callback provided
      if (onConflictCheck) {
        setIsChecking(true);
        try {
          const conflictResult = await onConflictCheck([...dateRanges, newRange]);
          if (conflictResult.hasConflict) {
            setConflictMessage(conflictResult.message || 'Date range conflicts with existing reservation');
            setCurrentRange({});
            setIsChecking(false);
            return;
          }
        } catch (error) {
          setConflictMessage('Error checking availability');
          setCurrentRange({});
          setIsChecking(false);
          return;
        }
        setIsChecking(false);
      }

      // Add the new range
      const updatedRanges = [...dateRanges, newRange];
      onDateRangesChange(updatedRanges);
      setCurrentRange({});
      setConflictMessage(null);
    } else {
      // Start a new range
      setCurrentRange({ start: date });
      setConflictMessage(null);
    }
  };

  const removeRange = (index: number) => {
    const updatedRanges = dateRanges.filter((_, i) => i !== index);
    onDateRangesChange(updatedRanges);
  };

  const addNewRange = () => {
    if (dateRanges.length < maxRanges) {
      setCurrentRange({});
      setIsOpen(true);
    }
  };

  const isDateDisabled = (date: Date) => {
    return disabledDates.some(disabledDate => isSameDay(date, disabledDate));
  };

  const isDateInRange = (date: Date) => {
    if (currentRange.start && !currentRange.end) {
      return isSameDay(date, currentRange.start);
    }
    return false;
  };

  const totalNights = dateRanges.reduce((total, range) => {
    const nights = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
    return total + nights;
  }, 0);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected Date Ranges */}
      {dateRanges.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Selected Periods ({totalNights} nights)</span>
            {dateRanges.length < maxRanges && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewRange}
                className="h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Period
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {dateRanges.map((range, index) => (
              <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                <span className="text-xs">
                  {format(range.start, 'MMM d')} - {format(range.end, 'MMM d')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeRange(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Date Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              dateRanges.length === 0 && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRanges.length > 0 
              ? `${dateRanges.length} period${dateRanges.length > 1 ? 's' : ''} selected`
              : placeholder
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            {currentRange.start && !currentRange.end && (
              <div className="mb-3 text-sm text-muted-foreground">
                Start: {format(currentRange.start, 'PPP')} - Select end date
              </div>
            )}
            {conflictMessage && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{conflictMessage}</AlertDescription>
              </Alert>
            )}
            <Calendar
              mode="single"
              selected={currentRange.start}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              modifiers={{
                inRange: isDateInRange,
              }}
              modifiersStyles={{
                inRange: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
            {isChecking && (
              <div className="mt-3 text-sm text-muted-foreground">
                Checking availability...
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Help Text */}
      {dateRanges.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Click to select your first date range. You can add up to {maxRanges} separate periods.
        </p>
      )}
    </div>
  );
};