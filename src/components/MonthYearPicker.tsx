import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

interface MonthYearPickerProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const MonthYearPicker = ({ currentDate, onDateChange }: MonthYearPickerProps) => {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Generate year range (e.g., 2020 to 2050)
  const years = Array.from({ length: 31 }, (_, i) => 2020 + i);

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(monthIndex));
    onDateChange(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(year));
    onDateChange(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="text-xl font-semibold hover:bg-accent">
          {monthNames[currentMonth]} {currentYear}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Month</label>
            <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
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
            <Select value={currentYear.toString()} onValueChange={handleYearChange}>
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
  );
};