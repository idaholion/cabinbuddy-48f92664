import { useState, useEffect } from "react";
import { Calendar, MapPin, User, Clock, ChevronDown, Edit2, Filter, Eye, EyeOff, ArrowLeftRight, Layers, Users, Search, CalendarDays, Plus, CalendarIcon, TestTube, ChevronUp, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useReservations } from "@/hooks/useReservations";
import { useTimePeriods } from "@/hooks/useTimePeriods";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { BookingForm } from "@/components/BookingForm";
import { TradeRequestForm } from "@/components/TradeRequestForm";
import { TradeRequestsManager } from "@/components/TradeRequestsManager";
import { MultiPeriodBookingForm } from "@/components/MultiPeriodBookingForm";
import { ReservationSplitDialog } from "@/components/ReservationSplitDialog";
import { CalendarKeeperAssistanceDialog } from "@/components/CalendarKeeperAssistanceDialog";
import { WorkWeekendProposalForm } from "@/components/WorkWeekendProposalForm";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { EnhancedMonthPicker } from "@/components/EnhancedMonthPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useTradeRequests } from "@/hooks/useTradeRequests";
import { useOrganization } from "@/hooks/useOrganization";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface PropertyCalendarProps {
  onMonthChange?: (date: Date) => void;
  selectedFamilyGroupFilter?: string;
}

export const PropertyCalendar = ({ onMonthChange, selectedFamilyGroupFilter }: PropertyCalendarProps) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { reservationSettings } = useReservationSettings();
  const { reservations, loading: reservationsLoading, refetchReservations } = useReservations();
  const { calculateTimePeriodWindows, timePeriodUsage } = useTimePeriods();
  const { rotationData } = useRotationOrder();
  const { familyGroups } = useFamilyGroups();
  const { tradeRequests } = useTradeRequests();
  const { toast } = useToast();
  
  // Check if user is calendar keeper (case-insensitive email comparison)
  const isCalendarKeeper = organization?.calendar_keeper_email?.toLowerCase() === user?.email?.toLowerCase();
  
  // Debug calendar keeper status in useEffect to avoid re-render loops
  useEffect(() => {
    console.log('Calendar keeper check:', {
      organizationEmail: organization?.calendar_keeper_email,
      userEmail: user?.email,
      isCalendarKeeper,
      organization: !!organization,
      user: !!user
    });
  }, [organization?.calendar_keeper_email, user?.email, isCalendarKeeper]);
  
  // Force refresh on component mount to ensure we get latest data
  useEffect(() => {
    refetchReservations();
  }, []);
  
  const [selectedProperty, setSelectedProperty] = useState("property");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showMultiPeriodForm, setShowMultiPeriodForm] = useState(false);
  const [showWorkWeekendForm, setShowWorkWeekendForm] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  
  // Phase 4: Enhanced filtering and view options
  const [filterOptions, setFilterOptions] = useState({
    showMyBookings: true,
    showOtherBookings: true,
    showTimePeriods: false, // Hidden by default to avoid confusion with actual reservations
    showTradeRequests: true,
    familyGroupFilter: 'all'
  });
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'timeline' | 'mini'>('calendar');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Date selection state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  
  // Selected date range for booking form
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  
  // Manual date entry state
  const [manualStartDate, setManualStartDate] = useState<Date | undefined>();
  const [manualEndDate, setManualEndDate] = useState<Date | undefined>();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showManualDateDialog, setShowManualDateDialog] = useState(false);
  
  // Test override toggle
  const [testOverrideMode, setTestOverrideMode] = useState(false);

  // Get user's family group and pending trade requests
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email?.toLowerCase() === user?.email?.toLowerCase())
  )?.name;

  const pendingTradeRequests = tradeRequests.filter(tr => 
    tr.target_family_group === userFamilyGroup && tr.status === 'pending'
  ).length;

  // Phase 4: Get trade requests affecting dates
  const getTradeRequestsForDate = (date: Date) => {
    return tradeRequests.filter(tr => {
      if (tr.status !== 'pending') return false;
      const requestStart = new Date(tr.requested_start_date);
      const requestEnd = new Date(tr.requested_end_date);
      return date >= requestStart && date <= requestEnd;
    });
  };

  // Get property name from database or use fallback
  const propertyName = reservationSettings?.property_name || "Property";
  
  const properties = [
    { id: "property", name: propertyName, location: reservationSettings?.address || "Location not set" }
  ];

  // Calculate time period windows for current month
  const timePeriodWindows = calculateTimePeriodWindows(
    currentMonth.getFullYear(),
    currentMonth
  );

  const handleBookingComplete = () => {
    refetchReservations();
  };

  const handleEditBookingAction = (action: string) => {
    if (action === 'request-trade') {
      setShowTradeForm(true);
    } else if (action === 'edit-my-bookings') {
      // This functionality already exists with the Edit buttons on individual reservations
      console.log('Edit my bookings - use the Edit buttons on individual reservations');
    } else if (action === 'request-assistance') {
      // Assistance dialog is now handled by the CalendarKeeperAssistanceDialog component
      console.log('Request calendar keeper assistance - handled by dialog component');
    }
  };

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
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

  const calendarDays = generateCalendarDays();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onMonthChange?.(today);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' || 
          document.activeElement?.getAttribute('role') === 'combobox') {
        return;
      }

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateMonth(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateMonth(1);
          break;
        case 't':
        case 'T':
          if (e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          jumpToToday();
          break;
        case 'Escape':
          // Close any open dialogs
          setShowBookingForm(false);
          setShowMultiPeriodForm(false);
          setShowWorkWeekendForm(false);
          setShowTradeForm(false);
          setShowSplitDialog(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Removed currentMonth dependency to prevent infinite loop

  const getBookingsForDate = (date: Date) => {
    const allBookings = reservations.filter(reservation => {
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      return date >= startDate && date <= endDate;
    });

    // Apply filtering from both the internal filter options and the external family group filter
    return allBookings.filter(booking => {
      // Apply external family group filter from parent component
      if (selectedFamilyGroupFilter && selectedFamilyGroupFilter !== '' && booking.family_group !== selectedFamilyGroupFilter) {
        return false;
      }
      
      // Apply internal filter options
      if (filterOptions.familyGroupFilter !== 'all' && booking.family_group !== filterOptions.familyGroupFilter) {
        return false;
      }
      
      const isMyBooking = booking.family_group === userFamilyGroup;
      if (isMyBooking && !filterOptions.showMyBookings) return false;
      if (!isMyBooking && !filterOptions.showOtherBookings) return false;
      
      return true;
    });
  };

  const getTimePeriodForDate = (date: Date) => {
    return timePeriodWindows.find(window => 
      date >= window.startDate && date <= window.endDate
    );
  };

  // Date selection handlers
  // Validate if a date is selectable based on time period constraints
  const isDateSelectable = (date: Date): { selectable: boolean; reason?: string } => {
    if (!rotationData) return { selectable: true };
    
    const monthYear = date.getFullYear();
    const timePeriodWindows = calculateTimePeriodWindows(monthYear, date);
    
    // Check if date falls within any valid time period window
    const validWindow = timePeriodWindows.find(window => {
      const windowStart = new Date(window.startDate);
      const windowEnd = new Date(window.endDate);
      return date >= windowStart && date <= windowEnd;
    });
    
    if (!validWindow) {
      return { 
        selectable: false, 
        reason: `Dates must be within ${rotationData.start_day || 'Friday'} to ${rotationData.start_day || 'Friday'} time periods` 
      };
    }
    
    return { selectable: true };
  };

  // Validate if a date range is selectable
  const isDateRangeSelectable = (startDate: Date, endDate: Date): { selectable: boolean; reason?: string } => {
    if (!rotationData) return { selectable: true };
    
    const maxNights = rotationData.max_nights || 7;
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysDiff > maxNights) {
      return { 
        selectable: false, 
        reason: `Selection cannot exceed ${maxNights} nights` 
      };
    }
    
    // Check if the entire range falls within a single time period window
    const monthYear = startDate.getFullYear();
    const timePeriodWindows = calculateTimePeriodWindows(monthYear, startDate);
    
    const validWindow = timePeriodWindows.find(window => {
      const windowStart = new Date(window.startDate);
      const windowEnd = new Date(window.endDate);
      return startDate >= windowStart && endDate <= windowEnd;
    });
    
    if (!validWindow) {
      return { 
        selectable: false, 
        reason: `Selection must fall within a single ${rotationData.start_day || 'Friday'} to ${rotationData.start_day || 'Friday'} time period` 
      };
    }
    
    return { selectable: true };
  };

  const handleDateClick = (date: Date) => {
    if (isDragging) return;
    
    const validation = isDateSelectable(date);
    if (!validation.selectable) {
      toast({
        title: "Invalid Date Selection",
        description: validation.reason,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedDates(prev => {
      const isSelected = prev.some(d => d.toDateString() === date.toDateString());
      if (isSelected) {
        return prev.filter(d => d.toDateString() !== date.toDateString());
      } else {
        return [...prev, date];
      }
    });
  };

  const handleDateMouseDown = (date: Date) => {
    // Allow initial selection - validation happens on range completion
    setIsDragging(true);
    setDragStartDate(date);
    setSelectedDates([date]);
  };

  const handleDateMouseEnter = (date: Date) => {
    if (!isDragging || !dragStartDate) return;
    
    const startDate = dragStartDate < date ? dragStartDate : date;
    const endDate = dragStartDate < date ? date : dragStartDate;
    const datesInRange: Date[] = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      datesInRange.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    setSelectedDates(datesInRange);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartDate(null);
  };

  const clearSelection = () => {
    setSelectedDates([]);
  };

  const createReservationFromSelection = () => {
    if (selectedDates.length === 0) return;
    
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    
    // Set the calculated dates for the booking form
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    
    // Open booking form with pre-selected dates and test override
    setShowBookingForm(true);
  };

  // Manual date entry handlers
  const addManualDateRange = () => {
    if (!manualStartDate) return;
    
    const endDate = manualEndDate || manualStartDate;
    const startDate = manualStartDate < endDate ? manualStartDate : endDate;
    const finalEndDate = manualStartDate < endDate ? endDate : manualStartDate;
    
    // Validate the date range
    const rangeValidation = isDateRangeSelectable(startDate, finalEndDate);
    if (!rangeValidation.selectable) {
      toast({
        title: "Invalid Date Range",
        description: rangeValidation.reason,
        variant: "destructive",
      });
      return;
    }
    
    const datesInRange: Date[] = [];
    const current = new Date(startDate);
    while (current <= finalEndDate) {
      datesInRange.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    // Add to existing selection, avoiding duplicates
    const existingDateStrings = selectedDates.map(d => d.toDateString());
    const newDates = datesInRange.filter(d => !existingDateStrings.includes(d.toDateString()));
    
    setSelectedDates(prev => [...prev, ...newDates]);
    setManualStartDate(undefined);
    setManualEndDate(undefined);
  };

  const addSingleManualDate = () => {
    if (!manualStartDate) return;
    
    // Validate the single date
    const validation = isDateSelectable(manualStartDate);
    if (!validation.selectable) {
      toast({
        title: "Invalid Date Selection",
        description: validation.reason,
        variant: "destructive",
      });
      return;
    }
    
    const dateString = manualStartDate.toDateString();
    const isAlreadySelected = selectedDates.some(d => d.toDateString() === dateString);
    
    if (!isAlreadySelected) {
      setSelectedDates(prev => [...prev, manualStartDate]);
    }
    
    setManualStartDate(undefined);
  };

  // Add mouse up event listener
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => d.toDateString() === date.toDateString());
  };

  return (
    <div className="space-y-6">


      {/* Date Selection Status */}
      {selectedDates.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <strong>{selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected</strong>
                  {selectedDates.length > 1 && (
                    <span className="text-muted-foreground ml-2">
                      {selectedDates[0].toLocaleDateString()} - {selectedDates[selectedDates.length - 1].toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Booking
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                    <DropdownMenuItem onClick={createReservationFromSelection}>
                      Create Reservation from Selection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowMultiPeriodForm(true)}>
                      Multi-Period Booking
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowWorkWeekendForm(true)}>
                      Work Weekend Proposal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowManualDateDialog(true)}>
                      Manual Date Selection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="pb-2">
          {/* Move controls to top of container */}
          <div className="flex items-center justify-between w-full gap-4 mb-2">
            {/* Phase 4: View Mode Toggle - positioned on left */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button 
                variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-none"
              >
                <Calendar className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <Layers className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button 
                variant={viewMode === 'timeline' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="rounded-none"
              >
                <ArrowLeftRight className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Timeline</span>
              </Button>
              <Button 
                variant={viewMode === 'mini' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('mini')}
                className="rounded-r-lg"
              >
                <Calendar className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Mini</span>
              </Button>
            </div>
            
            {/* Save Reservations Button */}
            <Button variant="default" size="sm" className="bg-success hover:bg-success/90">
              <Save className="h-4 w-4 mr-1" />
              Save Reservations
            </Button>
            
            {/* Test Mode Button */}
            {isCalendarKeeper && (
              <Button
                variant={testOverrideMode ? "default" : "outline"}
                onClick={() => setTestOverrideMode(!testOverrideMode)}
                size="sm"
                className={testOverrideMode ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-orange-300 text-orange-700 hover:bg-orange-100"}
              >
                Test
              </Button>
            )}
            
            {/* Phase 4: Filter Dropdown - positioned in center */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-4">
              <div className="space-y-3">
                <div className="text-sm font-medium">Show Bookings</div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={filterOptions.showMyBookings}
                      onChange={(e) => setFilterOptions(prev => ({...prev, showMyBookings: e.target.checked}))}
                      className="rounded border-border"
                    />
                    <span>My bookings</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={filterOptions.showOtherBookings}
                      onChange={(e) => setFilterOptions(prev => ({...prev, showOtherBookings: e.target.checked}))}
                      className="rounded border-border"
                    />
                    <span>Other bookings</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={filterOptions.showTimePeriods}
                      onChange={(e) => setFilterOptions(prev => ({...prev, showTimePeriods: e.target.checked}))}
                      className="rounded border-border"
                    />
                    <span>Time periods</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={filterOptions.showTradeRequests}
                      onChange={(e) => setFilterOptions(prev => ({...prev, showTradeRequests: e.target.checked}))}
                      className="rounded border-border"
                    />
                    <span>Trade requests</span>
                  </label>
                </div>
                
                <div className="text-sm font-medium pt-2 border-t">Family Group</div>
                <Select 
                  value={filterOptions.familyGroupFilter} 
                  onValueChange={(value) => setFilterOptions(prev => ({...prev, familyGroupFilter: value}))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {familyGroups.map(fg => (
                      <SelectItem key={fg.id} value={fg.name}>{fg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Search Input - positioned on right */}
            <SearchInput
              placeholder="Search reservations, family groups..."
              onSearch={setSearchQuery}
              className="w-64"
            />
          </div>
          
            <div className="flex items-center justify-between">
            <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
              {/* Property selector removed from here */}
            </div>
            
            <div className="flex items-center gap-2 mt-3 lg:mt-0">
              {/* Controls moved to top */}
            </div>
          </div>
          
          {/* Month Navigation and Family Group Color Legend - moved up with minimal spacing */}
          <div className="mt-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                  ←
                </Button>
                <EnhancedMonthPicker 
                  currentDate={currentMonth} 
                  onDateChange={(newDate) => {
                    setCurrentMonth(newDate);
                    onMonthChange?.(newDate);
                  }}
                  reservations={reservations}
                />
                <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                  →
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={jumpToToday}
                  className="ml-2 font-medium"
                  title="Jump to today (Press T)"
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Today
                </Button>
              </div>
              {familyGroups.some(fg => fg.color) && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Family Groups:</span>
                  <div className="flex flex-wrap gap-2">
                    {familyGroups
                      .filter(fg => fg.color)
                      .map(familyGroup => (
                        <div key={familyGroup.id} className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full border border-border"
                            style={{ backgroundColor: familyGroup.color }}
                          />
                          <span className="text-xs">{familyGroup.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Enhanced Calendar Grid with Loading States */}
          {viewMode === 'calendar' && (
            <>
              {reservationsLoading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length: 42}).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                const dayBookings = getBookingsForDate(day);
                const timePeriod = getTimePeriodForDate(day);
                const tradeRequests = getTradeRequestsForDate(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const hasMyBooking = dayBookings.some(b => b.family_group === userFamilyGroup);
                const hasPendingTrade = tradeRequests.length > 0 && filterOptions.showTradeRequests;
                const isSelected = isDateSelected(day);
                
                return (
                  <div
                    key={index}
                    className={`min-h-16 sm:min-h-20 md:min-h-24 p-1 border border-border relative transition-all duration-200 select-none ${
                      !isCurrentMonth ? 'bg-muted/50' : 'bg-background'
                    } ${isToday ? 'ring-2 ring-primary shadow-warm' : ''} ${
                      timePeriod && filterOptions.showTimePeriods ? 'border-l-4 border-l-accent' : ''
                    } ${
                      hasMyBooking ? 'bg-primary/5 border-primary/20' : ''
                    } ${
                      hasPendingTrade ? 'bg-destructive/5 border-destructive/20' : ''
                    } ${
                      isSelected ? 'bg-primary/20 border-primary ring-1 ring-primary/50' : ''
                    } hover:bg-accent/10 hover:shadow-cabin cursor-pointer group`}
                    onClick={() => handleDateClick(day)}
                    onMouseDown={() => handleDateMouseDown(day)}
                    onMouseEnter={() => handleDateMouseEnter(day)}
                  >
                    <div className={`text-sm font-medium ${
                      !isCurrentMonth ? 'text-muted-foreground' : isToday ? 'text-primary' : 'text-foreground'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    {/* Enhanced indicators row */}
                    <div className="flex items-center justify-between mb-1">
                      {/* Time period indicator */}
                      {timePeriod && isCurrentMonth && filterOptions.showTimePeriods && (
                        <div className="text-xs text-accent-foreground bg-accent/20 px-1 rounded truncate flex-1 mr-1">
                          {timePeriod.familyGroup}
                        </div>
                      )}
                      
                      {/* Status indicators */}
                      <div className="flex items-center space-x-1">
                        {hasMyBooking && (
                          <div className="w-2 h-2 bg-primary rounded-full" title="Your booking" />
                        )}
                        {hasPendingTrade && (
                          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" title="Pending trade" />
                        )}
                        {dayBookings.some(b => b.time_period_number) && (
                          <div className="w-2 h-2 bg-secondary rounded-full" title="Multi-period booking" />
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced bookings display - only show actual reservations */}
                    <div className="mt-1 space-y-0.5">
                      {dayBookings.slice(0, 2).map((booking, i) => {
                        const isMyBooking = booking.family_group === userFamilyGroup;
                        const familyGroup = familyGroups.find(fg => fg.name === booking.family_group);
                        const groupColor = familyGroup?.color;
                        
                        return (
                          <div
                            key={i}
                            className={`text-xs px-1 py-0.5 rounded truncate transition-colors border ${
                              groupColor 
                                ? 'text-white' 
                                : isMyBooking 
                                  ? 'bg-primary/20 text-primary-foreground border-primary/30' 
                                  : booking.status === 'confirmed' 
                                    ? 'bg-secondary/50 text-secondary-foreground border-secondary/30' 
                                    : 'bg-muted/60 text-muted-foreground border-muted/30'
                            } ${
                              booking.time_period_number ? 'border-l-2 border-l-accent' : ''
                            }`}
                            style={{
                              backgroundColor: groupColor || undefined,
                              borderColor: groupColor ? `${groupColor}66` : undefined,
                              textShadow: groupColor ? '0 1px 2px rgba(0,0,0,0.8)' : undefined
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate font-medium">{booking.family_group}</span>
                              {booking.time_period_number && (
                                <span className="ml-1 text-xs opacity-80">P{booking.time_period_number}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show time period info only when no actual bookings exist for this date */}
                      {dayBookings.length === 0 && timePeriod && isCurrentMonth && filterOptions.showTimePeriods && (
                        <div className="text-xs px-1 py-0.5 bg-accent/10 text-accent-foreground border border-accent/20 rounded truncate">
                          <div className="flex items-center justify-between">
                            <span className="truncate">Available: {timePeriod.familyGroup}</span>
                            <span className="ml-1 text-xs opacity-70">P{timePeriod.periodNumber}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Trade requests indicator */}
                      {hasPendingTrade && (
                        <div className="text-xs px-1 py-0.5 bg-destructive/20 text-destructive rounded truncate">
                          <ArrowLeftRight className="h-3 w-3 inline mr-1" />
                          Trade Request
                        </div>
                      )}
                      
                      {dayBookings.length > 2 && (
                        <div className="text-xs text-muted-foreground bg-muted/30 px-1 rounded">
                          +{dayBookings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
                  })}
                </div>
                
                {/* Floating Create Reservation Button */}
                {selectedDates.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="relative h-full">
                      {(() => {
                        // Calculate position for floating button based on selected dates
                        const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
                        const firstDate = sortedDates[0];
                        const lastDate = sortedDates[sortedDates.length - 1];
                        
                        // Find the index of the first selected date to calculate position
                        const firstDateIndex = calendarDays.findIndex(day => 
                          day.toDateString() === firstDate.toDateString()
                        );
                        const lastDateIndex = calendarDays.findIndex(day => 
                          day.toDateString() === lastDate.toDateString()
                        );
                        
                        if (firstDateIndex === -1) return null;
                        
                        // Calculate grid position
                        const startRow = Math.floor(firstDateIndex / 7);
                        const endRow = Math.floor(lastDateIndex / 7);
                        const centerRow = Math.floor((startRow + endRow) / 2);
                        
                        // Position the button in the center of the selection
                        const topPosition = centerRow * 100 + 50; // Approximate center of the row
                        
                        return (
                          <div 
                            className="absolute left-1/2 transform -translate-x-1/2 z-10 pointer-events-auto animate-scale-in"
                            style={{ 
                              top: `${topPosition}px`,
                            }}
                          >
                            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg border border-primary/20 backdrop-blur-sm">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={createReservationFromSelection}
                                  className="bg-background/10 hover:bg-background/20 text-primary-foreground border-0"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Create Reservation
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={clearSelection}
                                  className="bg-background/10 hover:bg-background/20 text-primary-foreground border-0"
                                >
                                  ✕
                                </Button>
                              </div>
                              <div className="text-xs text-center mt-1 opacity-90">
                                {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} selected
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                </div>
              )}
            </>
          )}
          
          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-2">
              {calendarDays
                .filter(day => day.getMonth() === currentMonth.getMonth())
                .map(day => {
                  const dayBookings = getBookingsForDate(day);
                  const timePeriod = getTimePeriodForDate(day);
                  const tradeRequests = getTradeRequestsForDate(day);
                  
                  if (dayBookings.length === 0 && (!timePeriod || !filterOptions.showTimePeriods) && (tradeRequests.length === 0 || !filterOptions.showTradeRequests)) {
                    return null;
                  }
                  
                  return (
                    <div key={day.toISOString()} className="p-3 border border-border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="flex items-center space-x-2">
                          {timePeriod && filterOptions.showTimePeriods && (
                            <Badge variant="outline">{timePeriod.familyGroup} Period</Badge>
                          )}
                          {tradeRequests.length > 0 && filterOptions.showTradeRequests && (
                            <Badge variant="destructive">Trade Request</Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {dayBookings.map((booking, i) => {
                          const familyGroup = familyGroups.find(fg => fg.name === booking.family_group);
                          const groupColor = familyGroup?.color;
                          
                          return (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {groupColor && (
                                  <div
                                    className="w-3 h-3 rounded-full border border-border"
                                    style={{ backgroundColor: groupColor }}
                                  />
                                )}
                                <span>{booking.family_group}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {booking.time_period_number && (
                                  <Badge variant="secondary" className="text-xs">Period {booking.time_period_number}</Badge>
                                )}
                                <Badge variant={booking.status === 'confirmed' ? 'default' : 'outline'}>
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          )}
          
          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="space-y-4">
              {familyGroups.map(familyGroup => {
                const groupBookings = reservations.filter(r => 
                  r.family_group === familyGroup.name &&
                  new Date(r.start_date).getMonth() === currentMonth.getMonth()
                );
                
                if (groupBookings.length === 0 && filterOptions.familyGroupFilter !== 'all' && filterOptions.familyGroupFilter !== familyGroup.name) {
                  return null;
                }
                
                return (
                  <div key={familyGroup.id} className="p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-center space-x-3 mb-3">
                      {familyGroup.color && (
                        <div
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: familyGroup.color }}
                        />
                      )}
                      <Users className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">{familyGroup.name}</h4>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                    <div className="space-y-2">
                      {groupBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bookings this month</p>
                      ) : (
                        groupBookings.map(booking => (
                          <div key={booking.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div className="text-sm">
                              {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-2">
                              {booking.time_period_number && (
                                <Badge variant="outline" className="text-xs">P{booking.time_period_number}</Badge>
                              )}
                              <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mini View */}
          {viewMode === 'mini' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }, (_, monthOffset) => {
                  const quarterMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
                  const monthName = quarterMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const daysInMonth = new Date(quarterMonth.getFullYear(), quarterMonth.getMonth() + 1, 0).getDate();
                  const firstDayOfWeek = new Date(quarterMonth.getFullYear(), quarterMonth.getMonth(), 1).getDay();
                  
                  // Get reservations for this month
                  const monthReservations = reservations.filter(reservation => {
                    const startDate = new Date(reservation.start_date);
                    const endDate = new Date(reservation.end_date);
                    return (startDate.getMonth() === quarterMonth.getMonth() && startDate.getFullYear() === quarterMonth.getFullYear()) ||
                           (endDate.getMonth() === quarterMonth.getMonth() && endDate.getFullYear() === quarterMonth.getFullYear()) ||
                           (startDate <= quarterMonth && endDate >= new Date(quarterMonth.getFullYear(), quarterMonth.getMonth() + 1, 0));
                  });

                  // Create calendar grid
                  const calendarDays = [];
                  // Add empty cells for days before the first day of the month
                  for (let i = 0; i < firstDayOfWeek; i++) {
                    calendarDays.push(null);
                  }
                  // Add days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    calendarDays.push(new Date(quarterMonth.getFullYear(), quarterMonth.getMonth(), day));
                  }

                  const isCurrentMonth = quarterMonth.getMonth() === new Date().getMonth() && quarterMonth.getFullYear() === new Date().getFullYear();

                  return (
                    <div 
                      key={monthOffset} 
                      className={`p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors ${
                        isCurrentMonth ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => {
                        setCurrentMonth(quarterMonth);
                        setViewMode('calendar');
                        onMonthChange?.(quarterMonth);
                      }}
                    >
                      <div className="text-center mb-2">
                        <h3 className="text-sm font-medium">{monthName}</h3>
                      </div>
                      
                      {/* Mini calendar header */}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                          <div key={index} className="text-xs text-center text-muted-foreground">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Mini calendar grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                          if (!day) {
                            return <div key={index} className="h-6"></div>;
                          }
                          
                          // Check if this day has any reservations
                          const dayReservations = monthReservations.filter(reservation => {
                            const startDate = new Date(reservation.start_date);
                            const endDate = new Date(reservation.end_date);
                            return day >= startDate && day <= endDate;
                          });
                          
                          // Get the primary reservation color for this day
                          let backgroundColor = '';
                          if (dayReservations.length > 0) {
                            const familyGroup = familyGroups.find(fg => fg.name === dayReservations[0].family_group);
                            backgroundColor = familyGroup?.color || '#e5e7eb';
                          }
                          
                          const isToday = day.toDateString() === new Date().toDateString();
                          
                          return (
                            <div
                              key={index}
                              className={`h-6 w-6 flex items-center justify-center text-xs rounded ${
                                isToday ? 'ring-1 ring-primary' : ''
                              }`}
                              style={{
                                backgroundColor: backgroundColor || 'transparent',
                                color: backgroundColor ? '#ffffff' : 'inherit'
                              }}
                            >
                              {day.getDate()}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Legend for this month */}
                      <div className="mt-2 space-y-1">
                        {[...new Set(monthReservations.map(r => r.family_group))].map(familyGroupName => {
                          const familyGroup = familyGroups.find(fg => fg.name === familyGroupName);
                          return (
                            <div key={familyGroupName} className="flex items-center gap-1 text-xs">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: familyGroup?.color || '#e5e7eb' }}
                              />
                              <span className="truncate">{familyGroupName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Click on any month to view detailed calendar
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reservations</CardTitle>
          <CardDescription>Current month reservations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reservations
              .filter(reservation => {
                const startDate = new Date(reservation.start_date);
                return startDate.getMonth() === currentMonth.getMonth();
              })
              .slice(0, 10)
              .map((reservation) => (
                 <div key={reservation.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                   <div className="flex items-center space-x-4">
                     <div className="h-10 w-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                       <User className="h-5 w-5 text-primary-foreground" />
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         {(() => {
                           const familyGroup = familyGroups.find(fg => fg.name === reservation.family_group);
                           return familyGroup?.color && (
                             <div
                               className="w-3 h-3 rounded-full border border-border"
                               style={{ backgroundColor: familyGroup.color }}
                             />
                           );
                         })()}
                         <div className="font-medium">{reservation.family_group}</div>
                       </div>
                       <div className="text-sm text-muted-foreground flex items-center">
                         <MapPin className="h-3 w-3 mr-1" />
                         {reservation.property_name || propertyName}
                       </div>
                       <div className="text-sm text-muted-foreground flex items-center">
                         <Clock className="h-3 w-3 mr-1" />
                         {new Date(reservation.start_date).toLocaleDateString()} to {new Date(reservation.end_date).toLocaleDateString()}
                       </div>
                       {reservation.nights_used && (
                         <div className="text-xs text-muted-foreground">
                           {reservation.nights_used} nights • Period #{reservation.time_period_number}
                         </div>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => {
                            setEditingReservation(reservation);
                            setShowBookingForm(true);
                          }}>
                            Edit Booking
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingReservation(reservation);
                            setShowSplitDialog(true);
                          }}>
                            Split into Periods
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                     <Badge variant={reservation.status === "confirmed" ? "default" : "secondary"}>
                       {reservation.status}
                     </Badge>
                   </div>
                 </div>
              ))}
            
            {reservations.filter(reservation => {
              const startDate = new Date(reservation.start_date);
              return startDate.getMonth() === currentMonth.getMonth();
            }).length === 0 && (
              <p className="text-muted-foreground text-center py-4">No reservations this month</p>
            )}
            
            {/* Time period usage summary */}
            {timePeriodUsage.length > 0 && (
              <div className="mt-4 p-3 bg-muted/30 rounded">
                <h4 className="text-sm font-medium mb-2">Time Period Usage ({currentMonth.getFullYear()})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {timePeriodUsage.map((usage) => (
                    <div key={usage.family_group} className="text-xs">
                      <span className="font-medium">{usage.family_group}:</span>
                      <span className="text-muted-foreground ml-1">
                        {usage.time_periods_used}/{usage.time_periods_allowed} periods
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trade Requests Manager */}
      {pendingTradeRequests > 0 || tradeRequests.length > 0 ? (
        <TradeRequestsManager />
      ) : null}

      {/* Booking Form Dialog */}
      <BookingForm 
        open={showBookingForm}
        onOpenChange={(open) => {
          setShowBookingForm(open);
          if (!open) {
            setEditingReservation(null);
            setSelectedStartDate(null);
            setSelectedEndDate(null);
          }
        }}
        currentMonth={currentMonth}
        onBookingComplete={handleBookingComplete}
        editingReservation={editingReservation}
        testOverrideMode={testOverrideMode}
        selectedStartDate={selectedStartDate}
        selectedEndDate={selectedEndDate}
      />

      {/* Multi-Period Booking Form Dialog */}
      <MultiPeriodBookingForm
        open={showMultiPeriodForm}
        onOpenChange={setShowMultiPeriodForm}
        currentMonth={currentMonth}
        onBookingComplete={handleBookingComplete}
      />

      {/* Reservation Split Dialog */}
      <ReservationSplitDialog
        open={showSplitDialog}
        onOpenChange={(open) => {
          setShowSplitDialog(open);
          if (!open) {
            setEditingReservation(null);
          }
        }}
        reservation={editingReservation}
        onSplitComplete={handleBookingComplete}
      />

      {/* Trade Request Form Dialog */}
      <TradeRequestForm 
        open={showTradeForm}
        onOpenChange={setShowTradeForm}
        onTradeComplete={handleBookingComplete}
      />

      {/* Manual Date Selection Dialog */}
      <Dialog open={showManualDateDialog} onOpenChange={setShowManualDateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Date Selection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Start Date Picker */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !manualStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {manualStartDate ? format(manualStartDate, "PPP") : "Pick a start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePicker
                      mode="single"
                      selected={manualStartDate}
                      onSelect={setManualStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date Picker (Optional) */}
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !manualEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {manualEndDate ? format(manualEndDate, "PPP") : "Pick an end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePicker
                      mode="single"
                      selected={manualEndDate}
                      onSelect={setManualEndDate}
                      initialFocus
                      defaultMonth={manualStartDate || new Date()}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  addSingleManualDate();
                  setShowManualDateDialog(false);
                }}
                disabled={!manualStartDate}
                className="w-full"
              >
                Add Single Date
              </Button>
              <Button
                onClick={() => {
                  addManualDateRange();
                  setShowManualDateDialog(false);
                }}
                disabled={!manualStartDate}
                variant="outline"
                className="w-full"
              >
                Add Date Range
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>Single Date:</strong> Select start date only</p>
              <p>• <strong>Date Range:</strong> Select both start and end dates</p>
              <p>• <strong>Visual Selection:</strong> Click and drag on the calendar</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Work Weekend Proposal Form Dialog */}
      <Dialog open={showWorkWeekendForm} onOpenChange={setShowWorkWeekendForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Propose Work Weekend</DialogTitle>
          </DialogHeader>
          <WorkWeekendProposalForm 
            onSuccess={() => {
              setShowWorkWeekendForm(false);
              handleBookingComplete();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};