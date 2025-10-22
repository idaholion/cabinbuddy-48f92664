import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedMonthPickerProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
  onNavigateMonth?: (direction: number) => void;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const EnhancedMonthPicker = ({ 
  currentDate, 
  onDateChange, 
  className,
  onNavigateMonth 
}: EnhancedMonthPickerProps) => {
  const [pickerDate, setPickerDate] = useState(currentDate);
  const [isOpen, setIsOpen] = useState(false);
  
  // Sync picker date with current date when it changes externally
  useEffect(() => {
    setPickerDate(currentDate);
  }, [currentDate]);
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();

  // Generate year range (current year ± 10 years)
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(pickerDate);
    newDate.setMonth(parseInt(monthIndex));
    // Set to first day of selected month for cleaner navigation
    newDate.setDate(1);
    console.log('EnhancedMonthPicker: Month changed to', newDate);
    setPickerDate(newDate);
    onDateChange(newDate);
    // Auto-close after selector change for immediate feedback
    setTimeout(() => setIsOpen(false), 100);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(pickerDate);
    newDate.setFullYear(parseInt(year));
    // Set to first day of selected month for cleaner navigation
    newDate.setDate(1);
    console.log('EnhancedMonthPicker: Year changed to', newDate);
    setPickerDate(newDate);
    onDateChange(newDate);
    // Auto-close after selector change for immediate feedback
    setTimeout(() => setIsOpen(false), 100);
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => onNavigateMonth?.(-1)}
        className="h-8 w-8 p-0 transition-all hover:scale-110"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn("text-lg font-semibold hover:bg-accent min-w-[140px]", className)}
          >
            {monthNames[currentMonth]} {currentYear}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
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
      </PopoverContent>
    </Popover>
    
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => onNavigateMonth?.(1)}
      className="h-8 w-8 p-0 transition-all hover:scale-110"
      aria-label="Next month"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
  );
};