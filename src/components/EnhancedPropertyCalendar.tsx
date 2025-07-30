import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReservations, Reservation } from '@/hooks/useEnhancedReservations';
import { PropertyCalendarSkeleton } from '@/components/ui/loading-skeletons';
import { QueryError } from '@/components/ui/error-states';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useDragSelection, DateRange } from '@/hooks/useDragSelection';

interface CalendarDay {
  date: Date;
  reservations: Reservation[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isAvailable: boolean;
}

interface EnhancedPropertyCalendarProps {
  onDateSelect?: (date: Date) => void;
  onReservationSelect?: (reservation: Reservation) => void;
  onDateRangeSelect?: (ranges: DateRange[]) => void;
  selectedFamilyGroup?: string;
  selectedFamilyGroupData?: { id: string; name: string; color: string };
  viewMode?: 'month' | 'week';
}

const FAMILY_GROUP_COLORS = [
  'bg-red-100 border-red-300 text-red-800',
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-yellow-100 border-yellow-300 text-yellow-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-indigo-100 border-indigo-300 text-indigo-800',
  'bg-orange-100 border-orange-300 text-orange-800',
];

export const EnhancedPropertyCalendar = ({
  onDateSelect,
  onReservationSelect,
  onDateRangeSelect,
  selectedFamilyGroup,
  selectedFamilyGroupData,
  viewMode = 'month'
}: EnhancedPropertyCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [familyGroupColors, setFamilyGroupColors] = useState<Record<string, string>>({});
  
  const { 
    reservations, 
    isLoading, 
    error, 
    getAvailabilityStatus 
  } = useReservations();
  
  const queryClient = useQueryClient();

  // Drag selection functionality
  const {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    removeRange,
    clearSelection,
    isDateInCurrentDrag,
    isDateInSelectedRanges,
    selectionColor,
  } = useDragSelection(onDateRangeSelect, 5, selectedFamilyGroupData?.color);

  // Handle mouse events for drag selection
  const handleMouseDown = useCallback((date: Date, e: React.MouseEvent) => {
    // Only start drag if clicking on available dates
    const dayReservations = reservations.filter(reservation => {
      const resStart = new Date(reservation.start_date);
      const resEnd = new Date(reservation.end_date);
      return date >= resStart && date <= resEnd;
    });

    const filteredReservations = selectedFamilyGroup 
      ? dayReservations.filter(r => r.family_group === selectedFamilyGroup)
      : dayReservations;

    if (filteredReservations.length === 0) {
      e.preventDefault();
      startDrag(date);
    }
  }, [reservations, selectedFamilyGroup, startDrag]);

  const handleMouseEnter = useCallback((date: Date) => {
    if (dragState.isDragging) {
      updateDrag(date);
    }
  }, [dragState.isDragging, updateDrag]);

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      endDrag();
    }
  }, [dragState.isDragging, endDrag]);

  // Generate family group color mapping
  useEffect(() => {
    const uniqueFamilyGroups = [...new Set(reservations.map(r => r.family_group))];
    const colorMap: Record<string, string> = {};
    
    uniqueFamilyGroups.forEach((group, index) => {
      if (group) {
        colorMap[group] = FAMILY_GROUP_COLORS[index % FAMILY_GROUP_COLORS.length];
      }
    });
    
    setFamilyGroupColors(colorMap);
  }, [reservations]);

  // Set up real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('calendar-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        () => {
          // Refresh reservations data
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const getCalendarDays = (): CalendarDay[] => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    return days.map(date => {
      const dayReservations = reservations.filter(reservation => {
        const resStart = new Date(reservation.start_date);
        const resEnd = new Date(reservation.end_date);
        return date >= resStart && date <= resEnd;
      });

      // Filter by selected family group if specified
      const filteredReservations = selectedFamilyGroup 
        ? dayReservations.filter(r => r.family_group === selectedFamilyGroup)
        : dayReservations;

      return {
        date,
        reservations: filteredReservations,
        isCurrentMonth: true,
        isToday: isToday(date),
        isAvailable: filteredReservations.length === 0,
      };
    });
  };

  const uniqueFamilyGroups = [...new Set(reservations.map(r => r.family_group).filter(Boolean))];

  if (isLoading) {
    return <PropertyCalendarSkeleton />;
  }

  if (error) {
    return (
      <QueryError 
        error={error as Error}
        title="Failed to load calendar"
        description="There was an error loading the reservation calendar."
      />
    );
  }

  const calendarDays = getCalendarDays();

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Calendar Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <CardTitle>Property Calendar</CardTitle>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Family Group Filter */}
                <Select value={selectedFamilyGroup || 'all'} onValueChange={(value) => {
                  // Handle family group selection
                  const group = value === 'all' ? undefined : value;
                  // You can pass this to parent component or handle locally
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {uniqueFamilyGroups.map(group => (
                      <SelectItem key={group} value={group}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-3 w-3 rounded-full border", familyGroupColors[group]?.replace('bg-', 'bg-').replace('border-', 'border-'))} />
                          {group}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Month Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[120px] text-center">
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Calendar Grid */}
            <div className="space-y-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2">{day}</div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div 
                className="grid grid-cols-7 gap-1 select-none"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {calendarDays.map((day, index) => {
                  const isInCurrentDrag = isDateInCurrentDrag(day.date);
                  const isInSelectedRange = isDateInSelectedRanges(day.date);
                  
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "min-h-20 p-1 border border-border rounded-md cursor-pointer transition-all duration-150",
                            day.isToday && "bg-primary/10 border-primary",
                            day.isAvailable && "hover:bg-muted",
                            !day.isAvailable && "bg-muted/50 cursor-not-allowed",
                            isInCurrentDrag && day.isAvailable && "bg-blue-100 border-blue-400 shadow-sm",
                            isInSelectedRange && `bg-${selectionColor}-100 border-${selectionColor}-400 shadow-sm`,
                            dragState.isDragging && day.isAvailable && "hover:bg-blue-50"
                          )}
                          onMouseDown={(e) => handleMouseDown(day.date, e)}
                          onMouseEnter={() => handleMouseEnter(day.date)}
                          onClick={() => {
                            if (!dragState.isDragging) {
                              onDateSelect?.(day.date);
                            }
                          }}
                        >
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            day.isToday ? "text-primary" : "text-foreground",
                            isInCurrentDrag && "text-blue-700",
                            isInSelectedRange && `text-${selectionColor}-700`
                          )}>
                            {format(day.date, 'd')}
                          </div>
                          
                          {/* Reservations */}
                          <div className="space-y-1">
                            {day.reservations.slice(0, 2).map((reservation, resIndex) => (
                              <div
                                key={resIndex}
                                className={cn(
                                  "text-xs px-1 py-0.5 rounded border cursor-pointer truncate",
                                  familyGroupColors[reservation.family_group] || 'bg-gray-100 border-gray-300 text-gray-800'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReservationSelect?.(reservation);
                                }}
                              >
                                {reservation.family_group}
                              </div>
                            ))}
                            {day.reservations.length > 2 && (
                              <div className="text-xs text-muted-foreground px-1">
                                +{day.reservations.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2">
                        <div className="font-medium">{format(day.date, 'PPP')}</div>
                        {day.reservations.length === 0 ? (
                          <div className="text-green-600">Available</div>
                        ) : (
                          <div className="space-y-1">
                            {day.reservations.map((res, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Users className="h-3 w-3" />
                                <span>{res.family_group}</span>
                                {res.guest_count && (
                                  <Badge variant="secondary" className="text-xs">
                                    {res.guest_count} guests
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Ranges Display */}
        {dragState.selectedRanges.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Selected Date Ranges</CardTitle>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dragState.selectedRanges.map((range, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 bg-${selectionColor}-50 border border-${selectionColor}-200 rounded-md`}>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className={`h-4 w-4 text-${selectionColor}-600`} />
                      <span className="text-sm font-medium">
                        {format(range.start, 'MMM d')} - {format(range.end, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRange(index)}
                      className={`h-6 w-6 p-0 text-${selectionColor}-600 hover:text-${selectionColor}-800`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-primary/10 border border-primary rounded" />
                <span className="text-sm">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted/50 border border-border rounded" />
                <span className="text-sm">Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-blue-100 border border-blue-400 rounded" />
                <span className="text-sm">Currently Selecting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 bg-${selectionColor}-100 border border-${selectionColor}-400 rounded`} />
                <span className="text-sm">
                  Selected Range {selectedFamilyGroupData && `(${selectedFamilyGroupData.name})`}
                </span>
              </div>
              {Object.entries(familyGroupColors).map(([group, colorClass]) => (
                <div key={group} className="flex items-center gap-2">
                  <div className={cn("h-4 w-4 rounded border", colorClass)} />
                  <span className="text-sm">{group}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};