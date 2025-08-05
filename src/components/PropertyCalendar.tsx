import { useState, useEffect } from "react";
import { Calendar, MapPin, User, Clock, ChevronDown, Edit2, Filter, Eye, EyeOff, ArrowLeftRight, Layers, Users, Search, CalendarDays, Plus, CalendarIcon, TestTube } from "lucide-react";
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
  
  // Check if user is calendar keeper
  const isCalendarKeeper = organization?.calendar_keeper_email === user?.email;
  
  // Debug calendar keeper status
  console.log('Calendar keeper check:', {
    organizationEmail: organization?.calendar_keeper_email,
    userEmail: user?.email,
    isCalendarKeeper
  });
  
  // Force refresh on component mount to ensure we get latest data
  useEffect(() => {
    console.log('PropertyCalendar mounted, fetching reservations...');
    refetchReservations();
  }, []);
  
  // Debug logging
  useEffect(() => {
    console.log('Reservations data:', reservations);
    console.log('Number of reservations:', reservations.length);
    console.log('Family groups with colors:', familyGroups.map(fg => ({ name: fg.name, color: fg.color })));
  }, [reservations, familyGroups]);
  
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
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'timeline'>('calendar');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Date selection state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  
  // Manual date entry state
  const [manualStartDate, setManualStartDate] = useState<Date | undefined>();
  const [manualEndDate, setManualEndDate] = useState<Date | undefined>();
  
  // Test override toggle
  const [testOverrideMode, setTestOverrideMode] = useState(false);

  // Get user's family group and pending trade requests
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email === user?.email)
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
  
  // Debug time period windows
  useEffect(() => {
    console.log('Time period windows:', timePeriodWindows);
    console.log('Number of time period windows:', timePeriodWindows.length);
  }, [timePeriodWindows]);

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
  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date, 'isDragging:', isDragging);
    if (isDragging) return;
    
    setSelectedDates(prev => {
      const isSelected = prev.some(d => d.toDateString() === date.toDateString());
      console.log('Date is selected:', isSelected, 'Current selection:', prev.length);
      if (isSelected) {
        const newSelection = prev.filter(d => d.toDateString() !== date.toDateString());
        console.log('Removing date, new selection:', newSelection.length);
        return newSelection;
      } else {
        const newSelection = [...prev, date];
        console.log('Adding date, new selection:', newSelection.length);
        return newSelection;
      }
    });
  };

  const handleDateMouseDown = (date: Date) => {
    console.log('Mouse down on date:', date);
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
    
    // Open booking form with pre-selected dates and test override
    setShowBookingForm(true);
  };

  // Manual date entry handlers
  const addManualDateRange = () => {
    if (!manualStartDate) return;
    
    const endDate = manualEndDate || manualStartDate;
    const startDate = manualStartDate < endDate ? manualStartDate : endDate;
    const finalEndDate = manualStartDate < endDate ? endDate : manualStartDate;
    
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
    const selected = selectedDates.some(d => d.toDateString() === date.toDateString());
    // Only log occasionally to avoid spam
    if (date.getDate() === 28 && date.getMonth() === 6) { // July 28th
      console.log('Checking if date is selected:', date, selected, 'Total selected:', selectedDates.length);
    }
    return selected;
  };

  // Debug effect to log selection changes
  useEffect(() => {
    console.log('Selected dates changed:', selectedDates.length, selectedDates.map(d => d.toDateString()));
  }, [selectedDates]);

  return (
    <div className="space-y-6">
      {/* Test Override Toggle */}
      {isCalendarKeeper && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <TestTube className="h-5 w-5" />
              Test Mode
            </CardTitle>
            <CardDescription className="text-orange-600">
              Calendar keeper testing controls - bypasses time window restrictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                variant={testOverrideMode ? "default" : "outline"}
                onClick={() => setTestOverrideMode(!testOverrideMode)}
                className={testOverrideMode ? "bg-orange-600 hover:bg-orange-700" : "border-orange-300 text-orange-700 hover:bg-orange-100"}
              >
                {testOverrideMode ? "Test Mode ON" : "Enable Test Mode"}
              </Button>
              {testOverrideMode && (
                <span className="text-sm text-orange-600 font-medium">
                  ⚠️ Time window restrictions bypassed for testing
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Date Entry */}
      {/* Manual Date Entry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Manual Date Entry</CardTitle>
          <CardDescription>Select specific dates using the date picker</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Add Buttons */}
            <div className="space-y-2">
              <Label className="opacity-0">Actions</Label>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={addSingleManualDate}
                  disabled={!manualStartDate}
                  size="sm"
                  className="w-full"
                >
                  Add Single Date
                </Button>
                <Button
                  onClick={addManualDateRange}
                  disabled={!manualStartDate}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Add Date Range
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>• <strong>Single Date:</strong> Select start date only and click "Add Single Date"</p>
            <p>• <strong>Date Range:</strong> Select both start and end dates, then click "Add Date Range"</p>
            <p>• <strong>Visual Selection:</strong> You can also click and drag on the calendar below</p>
          </div>
        </CardContent>
      </Card>

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
                <Button size="sm" onClick={createReservationFromSelection}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Reservation
                </Button>
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
            </div>
            
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
          }
        }}
        currentMonth={currentMonth}
        onBookingComplete={handleBookingComplete}
        editingReservation={editingReservation}
        testOverrideMode={testOverrideMode}
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