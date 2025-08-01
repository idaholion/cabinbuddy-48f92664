import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedMonthPickerProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  reservations?: any[];
  className?: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const shortMonthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const EnhancedMonthPicker = ({ 
  currentDate, 
  onDateChange, 
  reservations = [],
  className 
}: EnhancedMonthPickerProps) => {
  const [pickerDate, setPickerDate] = useState(currentDate);
  const [viewMode, setViewMode] = useState<'calendar' | 'selectors'>('calendar');
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();

  // Generate year range (current year ± 10 years)
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Generate mini calendar days for picker month
  const generateMiniCalendarDays = () => {
    const year = pickerYear;
    const month = pickerMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const miniCalendarDays = generateMiniCalendarDays();

  // Check if a date has reservations
  const getReservationStatus = (date: Date) => {
    const hasReservations = reservations.some(reservation => {
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      return date >= startDate && date <= endDate;
    });
    
    const reservationCount = reservations.filter(reservation => {
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      return date >= startDate && date <= endDate;
    }).length;

    return { hasReservations, reservationCount };
  };

  const navigatePickerMonth = (direction: number) => {
    const newDate = new Date(pickerDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setPickerDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    // Set to the clicked date and switch to that month
    onDateChange(date);
    setPickerDate(date);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(pickerDate);
    newDate.setMonth(parseInt(monthIndex));
    setPickerDate(newDate);
    onDateChange(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(pickerDate);
    newDate.setFullYear(parseInt(year));
    setPickerDate(newDate);
    onDateChange(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === pickerMonth;
  };

  const isSelectedDate = (date: Date) => {
    return date.toDateString() === currentDate.toDateString();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn("text-xl font-semibold hover:bg-accent", className)}
        >
          {monthNames[currentMonth]} {currentYear}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="rounded-none flex-1"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Calendar
            </Button>
            <Button 
              variant={viewMode === 'selectors' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('selectors')}
              className="rounded-none flex-1"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Selectors
            </Button>
          </div>

          {viewMode === 'calendar' ? (
            <div className="space-y-3">
              {/* Mini Calendar Header */}
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigatePickerMonth(-1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  {shortMonthNames[pickerMonth]} {pickerYear}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigatePickerMonth(1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={index} className="text-center text-xs font-medium text-muted-foreground p-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Mini Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {miniCalendarDays.map((day, index) => {
                  const { hasReservations, reservationCount } = getReservationStatus(day);
                  const today = isToday(day);
                  const currentMonthDay = isCurrentMonth(day);
                  const selected = isSelectedDate(day);

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "h-8 w-8 text-xs rounded-md relative transition-all duration-200 hover:bg-accent",
                        !currentMonthDay && "text-muted-foreground opacity-50",
                        today && "ring-2 ring-primary font-bold",
                        selected && "bg-primary text-primary-foreground",
                        hasReservations && !selected && "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {day.getDate()}
                      {hasReservations && reservationCount > 0 && (
                        <div className={cn(
                          "absolute -top-1 -right-1 h-3 w-3 rounded-full text-[8px] flex items-center justify-center",
                          selected 
                            ? "bg-primary-foreground text-primary" 
                            : "bg-primary text-primary-foreground"
                        )}>
                          {reservationCount > 9 ? '9+' : reservationCount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded border border-primary"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-secondary"></div>
                  <span>Has reservations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-primary"></div>
                  <span>Selected date</span>
                </div>
              </div>
            </div>
          ) : (
            /* Traditional Selectors View */
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={pickerMonth.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select value={pickerYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};