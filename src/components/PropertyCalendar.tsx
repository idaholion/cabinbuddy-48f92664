import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Calendar, MapPin, User, Clock, ChevronDown, Edit2, Filter, Eye, EyeOff, Layers, Users, Search, CalendarDays, Plus, CalendarIcon, TestTube, ChevronUp, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

import { WorkWeekendProposalForm } from "@/components/WorkWeekendProposalForm";
import { WorkWeekendCalendarEvent } from "@/components/WorkWeekendCalendarEvent";
import { WorkWeekendDetailDialog } from "@/components/WorkWeekendDetailDialog";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { EnhancedMonthPicker } from "@/components/EnhancedMonthPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useTradeRequests } from "@/hooks/useTradeRequests";
import { useWorkWeekends } from "@/hooks/useWorkWeekends";  
import { useOrganization } from "@/hooks/useOrganization";
import { useDebounce } from "@/hooks/useDebounce";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PropertyCalendarProps {
  onMonthChange?: (date: Date) => void;
  selectedFamilyGroupFilter?: string;
}

export interface PropertyCalendarRef {
  scrollToWorkWeekend: () => void;
}

export const PropertyCalendar = forwardRef<PropertyCalendarRef, PropertyCalendarProps>(({ onMonthChange, selectedFamilyGroupFilter }, ref) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { reservationSettings } = useReservationSettings();
  const { reservations, loading: reservationsLoading, updateReservation, deleteReservation, refetchReservations } = useReservations();
  
  // Work weekend accordion state and ref
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const workWeekendSectionRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToWorkWeekend: () => {
      setAccordionValue(prev => prev.includes('work-weekend') ? prev : [...prev, 'work-weekend']);
      setTimeout(() => {
        workWeekendSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }));
  const { calculateTimePeriodWindows } = useTimePeriods();
  const { rotationData } = useRotationOrder();
  const { familyGroups } = useFamilyGroups();
  const { tradeRequests } = useTradeRequests();
  const { workWeekends, refetchWorkWeekends } = useWorkWeekends();
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
  
  // Auto-refresh and focus handling for better UX - stabilized
  useEffect(() => {
    refetchReservations();
    
    // Auto-refresh when window regains focus - debounced
    let focusTimeout: NodeJS.Timeout;
    const handleFocus = () => {
      clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        console.log('Window focused - refreshing calendar data');
        refetchReservations();
      }, 1000); // Debounce focus events
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(focusTimeout);
    };
  }, []);
  
  // Removed aggressive error recovery that was causing flashing
  
  const [selectedProperty, setSelectedProperty] = useState("property");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showMultiPeriodForm, setShowMultiPeriodForm] = useState(false);
  const [showWorkWeekendForm, setShowWorkWeekendForm] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [reservationToDelete, setReservationToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Phase 4: Enhanced filtering and view options
  const [filterOptions, setFilterOptions] = useState({
    showMyBookings: true,
    showOtherBookings: true, // Make sure other bookings are shown by default
    showTimePeriods: false, // Hidden by default to avoid confusion with actual reservations
    showTradeRequests: true,
    showWorkWeekends: true,
    familyGroupFilter: 'all'
  });
  const [viewMode, setViewMode] = useState<'calendar' | 'mini'>('calendar');
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Date selection state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [dragPreviewDates, setDragPreviewDates] = useState<Date[]>([]);
  
  // Mouse tracking for drag threshold
  const [mouseDownPosition, setMouseDownPosition] = useState<{x: number, y: number} | null>(null);
  const [hasMovedBeyondThreshold, setHasMovedBeyondThreshold] = useState(false);
  
  // Selected date range for booking form
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  
  // Manual date entry state
  const [manualStartDate, setManualStartDate] = useState<Date | undefined>();
  const [manualEndDate, setManualEndDate] = useState<Date | undefined>();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showManualDateDialog, setShowManualDateDialog] = useState(false);
  const [selectedWorkWeekend, setSelectedWorkWeekend] = useState<any>(null);
  const [showWorkWeekendDetail, setShowWorkWeekendDetail] = useState(false);
  
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

  // Get work weekends for a specific date
  const getWorkWeekendsForDate = (date: Date) => {
    if (!filterOptions.showWorkWeekends) return [];
    
    return workWeekends.filter(ww => {
      if (ww.status !== 'fully_approved') return false;
      const startDate = parseLocalDate(ww.start_date);
      const endDate = parseLocalDate(ww.end_date);
      
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const workWeekendStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const workWeekendEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      return checkDate >= workWeekendStart && checkDate <= workWeekendEnd;
    });
  };

  // Function to determine text color based on background color for better contrast
  const getContrastTextColor = (backgroundColor: string) => {
    if (!backgroundColor) return '';
    
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return dark text for light backgrounds, light text for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
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
    console.log('Booking completed - refreshing reservations and work weekends');
    console.log('Current reservations before refetch:', reservations.length);
    refetchReservations();
    refetchWorkWeekends();
    
    // Force a re-render after a short delay to ensure state updates
    setTimeout(() => {
      console.log('Reservations after refetch delay:', reservations.length);
    }, 1000);
  };

  const handleDeleteReservation = async () => {
    if (!reservationToDelete) return;
    
    const success = await deleteReservation(reservationToDelete.id);
    if (success) {
      setShowDeleteDialog(false);
      setReservationToDelete(null);
      refetchReservations(); // Refresh the calendar
    }
  };

  const handleEditReservation = (reservation: any) => {
    console.log('=== handleEditReservation called ===', {
      reservation: reservation,
      reservationId: reservation?.id,
      familyGroup: reservation?.family_group
    });
    setEditingReservation(reservation);
    setShowBookingForm(true);
    console.log('=== State updated ===', {
      editingReservation: reservation,
      showBookingForm: true
    });
  };

  const handleEditBookingAction = (action: string) => {
    if (action === 'request-trade') {
      setShowTradeForm(true);
    } else if (action === 'edit-my-bookings') {
      // This functionality already exists with the Edit buttons on individual reservations
      console.log('Edit my bookings - use the Edit buttons on individual reservations');
    } else if (action === 'request-assistance') {
      console.log('Calendar keeper assistance functionality has been removed');
    }
  };

  // Helper function to get the primary host's first name
  const getHostFirstName = (reservation: any): string => {
    // Check if there are host assignments and get the primary host (first one)
    if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
      const primaryHost = reservation.host_assignments[0];
      if (primaryHost?.host_name) {
        // Extract first name (everything before the first space)
        return primaryHost.host_name.split(' ')[0];
      }
    }
    
    // Fallback to family group name if no host information
    return reservation.family_group || 'Unknown';
  };

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Calculate the end date dynamically to show only necessary weeks
    const endDate = new Date(lastDay);
    const remainingDays = 6 - lastDay.getDay();
    endDate.setDate(endDate.getDate() + remainingDays);
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate days until we reach the calculated end date
    while (current <= endDate) {
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

// Utility function to parse date strings as local dates (avoiding timezone shifts)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 because JS months are 0-indexed
};

const getBookingsForDate = (date: Date) => {
    const allBookings = reservations.filter(reservation => {
      const startDate = parseLocalDate(reservation.start_date);
      const endDate = parseLocalDate(reservation.end_date);
      
      // Normalize dates to avoid timezone issues
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const reservationStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const reservationEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      const isInRange = checkDate >= reservationStart && checkDate <= reservationEnd;
      
      return isInRange;
    });

    // Apply filtering from both the internal filter options and the external family group filter
    const filteredBookings = allBookings.filter(booking => {
      // Apply external family group filter from parent component
      if (selectedFamilyGroupFilter && selectedFamilyGroupFilter !== '' && booking.family_group !== selectedFamilyGroupFilter) {
        return false;
      }
      
      // Apply internal filter options
      if (filterOptions.familyGroupFilter !== 'all' && booking.family_group !== filterOptions.familyGroupFilter) {
        return false;
      }
      
      const isMyBooking = booking.family_group === userFamilyGroup;
      if (isMyBooking && !filterOptions.showMyBookings) {
        return false;
      }
      if (!isMyBooking && !filterOptions.showOtherBookings) {
        return false;
      }
      
      return true;
    });
    
    return filteredBookings;
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

  const handleWorkWeekendClick = (workWeekend: any) => {
    setSelectedWorkWeekend(workWeekend);
    setShowWorkWeekendDetail(true);
  };

  const handleDateClick = (date: Date) => {
    console.log('=== handleDateClick called ===', {
      date: date.toISOString(),
      isDragging,
      reservationsCount: reservations.length
    });
    
    if (isDragging) return;
    
    // First check if there are existing reservations on this date (unfiltered)
    const allBookings = reservations.filter(reservation => {
      const startDate = parseLocalDate(reservation.start_date);
      const endDate = parseLocalDate(reservation.end_date);
      
      // Normalize dates to avoid timezone issues
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const reservationStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const reservationEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      return checkDate >= reservationStart && checkDate <= reservationEnd;
    });
    
    console.log('=== Date click analysis ===', {
      clickedDate: date.toDateString(),
      allBookingsFound: allBookings.length,
      bookingDetails: allBookings.map(b => ({
        id: b.id,
        family: b.family_group,
        start: b.start_date,
        end: b.end_date
      }))
    });
    
    // If there are existing reservations, prioritize opening the first one for editing
    if (allBookings.length > 0) {
      console.log('=== Opening existing reservation for editing ===', allBookings[0]);
      handleEditReservation(allBookings[0]);
      return;
    }
    
    const validation = isDateSelectable(date);
    if (!validation.selectable) {
      toast({
        title: "Invalid Date Selection",
        description: validation.reason,
        variant: "destructive",
      });
      return;
    }
    
    // Create 8-day forward selection (clicked date + 7 days after)
    const eightDayRange: Date[] = [];
    for (let i = 0; i < 8; i++) {
      const currentDate = new Date(date);
      currentDate.setDate(currentDate.getDate() + i);
      eightDayRange.push(currentDate);
    }
    
    // Validate that the entire 8-day range is selectable
    const invalidDates = eightDayRange.filter(rangeDate => !isDateSelectable(rangeDate).selectable);
    
    if (invalidDates.length > 0) {
      // If the 8-day range isn't fully valid, just select the single date
      setSelectedDates(prev => {
        const isSelected = prev.some(d => d.toDateString() === date.toDateString());
        if (isSelected) {
          return prev.filter(d => d.toDateString() !== date.toDateString());
        } else {
          return [date];
        }
      });
      
      if (invalidDates.length < 8) {
        toast({
          title: "Partial Selection",
          description: `Selected single date only - ${invalidDates.length} of the 8 days would be invalid.`,
          variant: "default",
        });
      }
    } else {
      // Select the full 8-day range
      setSelectedDates(eightDayRange);
      toast({
        title: "8-Day Selection",
        description: `Selected ${date.toLocaleDateString()} + 7 following days`,
        variant: "default",
      });
    }
  };

  const handleDateMouseDown = (date: Date, event: React.MouseEvent) => {
    // Track initial mouse position for drag threshold
    setMouseDownPosition({ x: event.clientX, y: event.clientY });
    setDragStartDate(date);
    setHasMovedBeyondThreshold(false);
    // Don't set isDragging true yet - wait for movement threshold
  };

  const handleDateMouseEnter = (date: Date) => {
    // Only create range selections when actively dragging beyond threshold
    if (!isDragging || !dragStartDate || !hasMovedBeyondThreshold) return;
    
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
    setMouseDownPosition(null);
    setHasMovedBeyondThreshold(false);
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

  // Track mouse movement for drag threshold
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDownPosition || hasMovedBeyondThreshold) return;
      
      const dragThreshold = 5; // pixels
      const deltaX = Math.abs(e.clientX - mouseDownPosition.x);
      const deltaY = Math.abs(e.clientY - mouseDownPosition.y);
      
      if (deltaX > dragThreshold || deltaY > dragThreshold) {
        setHasMovedBeyondThreshold(true);
        setIsDragging(true);
        if (dragStartDate) {
          setSelectedDates([dragStartDate]);
        }
      }
    };

    if (mouseDownPosition) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [mouseDownPosition, hasMovedBeyondThreshold, dragStartDate]);

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
                className="rounded-l-lg"
              >
                <Calendar className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
              <Button 
                variant={viewMode === 'mini' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('mini')}
                className="rounded-r-lg"
              >
                <Layers className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Mini</span>
              </Button>
            </div>
            
            {/* Filter & Search and Save - Consolidated */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-1" />
                  Filter & Search
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 p-4">
                <div className="space-y-4">
                  {/* Search Section */}
                  <div>
                    <div className="text-sm font-medium mb-2">Search</div>
                    <SearchInput
                      placeholder="Search reservations, family groups..."
                      onSearch={setSearchQuery}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Filter Section */}
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium mb-2">Show Bookings</div>
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
                      <label className="flex items-center space-x-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={filterOptions.showWorkWeekends}
                          onChange={(e) => setFilterOptions(prev => ({...prev, showWorkWeekends: e.target.checked}))}
                          className="rounded border-border"
                        />
                        <span>Work weekends</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium mb-2">Family Group</div>
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
                </div>
              </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Calendar Keeper Override Mode Toggle */}
              {isCalendarKeeper && (
                <Button
                  variant={testOverrideMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTestOverrideMode(!testOverrideMode)}
                  className={testOverrideMode ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
                  title="Toggle override mode to bypass time period restrictions"
                >
                  <TestTube className="h-4 w-4 mr-1" />
                  Override Mode
                </Button>
              )}
            </div>
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
          <div className="mt-1 p-3 bg-background/95 rounded-lg border border-border/20 backdrop-blur-sm shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <EnhancedMonthPicker 
                  currentDate={currentMonth} 
                  onDateChange={(newDate) => {
                    setCurrentMonth(newDate);
                    onMonthChange?.(newDate);
                  }}
                  reservations={reservations}
                  onNavigateMonth={navigateMonth}
                />
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={jumpToToday}
                  className="hover-scale text-xs"
                  title="Jump to today (Press T)"
                >
                  <CalendarDays className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Today</span>
                  <span className="sm:hidden">T</span>
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
          {/* Enhanced Mobile-Responsive Calendar Header - Only show for calendar view */}
          {viewMode === 'calendar' && (
            <div className="grid grid-cols-7 gap-1 mb-4 bg-muted/30 rounded-lg p-2">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-foreground hover:bg-muted/50 rounded transition-colors">
                  <span className="hidden md:inline">{day}</span>
                  <span className="hidden sm:inline md:hidden">{day.substring(0, 3)}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>
          )}

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
                  {/* Navigation Arrows */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth(-1)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg border border-border/20 backdrop-blur-sm"
                    title="Previous month (←)"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth(1)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg border border-border/20 backdrop-blur-sm"
                    title="Next month (→)"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                  
                  <div className="grid grid-cols-7 gap-1">
                     {calendarDays.map((day, index) => {
                const dayBookings = getBookingsForDate(day);
                const dayWorkWeekends = getWorkWeekendsForDate(day);
                const timePeriod = getTimePeriodForDate(day);
                const tradeRequests = getTradeRequestsForDate(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const hasMyBooking = dayBookings.some(b => b.family_group === userFamilyGroup);
                const hasPendingTrade = tradeRequests.length > 0 && filterOptions.showTradeRequests;
                const hasWorkWeekend = dayWorkWeekends.length > 0;
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
                      hasWorkWeekend ? 'bg-green-50 border-green-200' : ''
                    } ${
                      isSelected ? 'bg-primary/20 border-primary ring-1 ring-primary/50' : ''
                    } hover:bg-accent/10 hover:shadow-cabin ${dayBookings.length > 0 ? '' : 'cursor-pointer'} group`}
                    onClick={dayBookings.length > 0 ? undefined : () => handleDateClick(day)}
                    onMouseDown={dayBookings.length > 0 ? undefined : (e) => handleDateMouseDown(day, e)}
                    onMouseEnter={dayBookings.length > 0 ? undefined : () => handleDateMouseEnter(day)}
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
                        {hasWorkWeekend && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Work weekend" />
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
                        
                        console.log('=== Rendering booking bar ===', {
                          bookingId: booking.id,
                          familyGroup: booking.family_group,
                          host: booking.host_assignments?.[0]?.host_name,
                          date: day.toDateString()
                        });
                        
                         return (
                            <div
                              key={i}
                              className={`text-sm px-2 py-1 rounded truncate transition-colors border font-semibold cursor-pointer hover:opacity-80 relative z-10 ${
                                groupColor 
                                  ? '' // We'll handle color via style for custom colors
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
                                color: groupColor ? getContrastTextColor(groupColor) : undefined,
                                textShadow: groupColor ? 
                                  getContrastTextColor(groupColor) === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)' 
                                  : undefined,
                                pointerEvents: 'auto'
                              }}
                              onClick={(e) => {
                                console.log('=== Booking bar clicked ===', {
                                  bookingId: booking.id,
                                  booking: booking
                                });
                                e.stopPropagation(); // Prevent date click
                                handleEditReservation(booking);
                              }}
                            >
                             <div className="flex items-center justify-between">
                               <span className="truncate font-bold text-sm">{getHostFirstName(booking)}</span>
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
                          <Edit2 className="h-3 w-3 inline mr-1" />
                          Trade Request
                        </div>
                      )}
                      
                      {/* Work weekends display */}
                      {dayWorkWeekends.map((workWeekend, i) => (
                        <WorkWeekendCalendarEvent
                          key={`${workWeekend.id}-${i}`}
                          workWeekend={workWeekend}
                          isCompact={true}
                          onClick={handleWorkWeekendClick}
                        />
                      ))}
                      
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
          
          {/* Mini View */}
          {viewMode === 'mini' && (
            <div className="space-y-4">
              {/* Navigation controls for mini view */}
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigateMonth(-4)}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Quarter
                </Button>
                <div className="text-sm font-medium">
                  {currentMonth.getFullYear()} Quarter {Math.floor(currentMonth.getMonth() / 3) + 1}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigateMonth(4)}
                  className="flex items-center gap-2"
                >
                  Next Quarter
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }, (_, monthOffset) => {
                  const quarterMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
                  const monthName = quarterMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const daysInMonth = new Date(quarterMonth.getFullYear(), quarterMonth.getMonth() + 1, 0).getDate();
                  const firstDayOfWeek = new Date(quarterMonth.getFullYear(), quarterMonth.getMonth(), 1).getDay();
                  
                  // Get reservations for this month
                  const monthReservations = reservations.filter(reservation => {
                    const startDate = parseLocalDate(reservation.start_date);
                    const endDate = parseLocalDate(reservation.end_date);
                    const monthStart = new Date(quarterMonth.getFullYear(), quarterMonth.getMonth(), 1);
                    const monthEnd = new Date(quarterMonth.getFullYear(), quarterMonth.getMonth() + 1, 0);
                    
                    // Include reservations that:
                    // 1. Start in this month
                    // 2. End in this month  
                    // 3. Span across this month (start before and end after)
                    return (startDate.getMonth() === quarterMonth.getMonth() && startDate.getFullYear() === quarterMonth.getFullYear()) ||
                           (endDate.getMonth() === quarterMonth.getMonth() && endDate.getFullYear() === quarterMonth.getFullYear()) ||
                           (startDate <= monthEnd && endDate >= monthStart);
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
                            const startDate = parseLocalDate(reservation.start_date);
                            const endDate = parseLocalDate(reservation.end_date);
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

      {/* Work Weekend Proposals - Between calendar and upcoming reservations */}
      <div ref={workWeekendSectionRef}>
        <Accordion 
          type="multiple" 
          className="space-y-2"
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          <AccordionItem value="work-weekend" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline">
              Work Weekend Proposals
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 animate-accordion-down">
              <WorkWeekendProposalForm />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Upcoming Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reservations</CardTitle>
          <CardDescription>Reservations in the next 60 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const next60Days = new Date(today);
              next60Days.setDate(today.getDate() + 60);
              
              // Combine reservations and work weekends
              const upcomingItems = [
                // Regular reservations
                ...reservations
                  .filter(reservation => {
                    const startDate = parseLocalDate(reservation.start_date);
                    return startDate >= today && startDate <= next60Days;
                  })
                  .map(reservation => ({
                    ...reservation,
                    type: 'reservation',
                    sortDate: parseLocalDate(reservation.start_date)
                  })),
                
                // Work weekends
                ...workWeekends
                  .filter(workWeekend => {
                    const startDate = parseLocalDate(workWeekend.start_date);
                    return startDate >= today && startDate <= next60Days;
                  })
                  .map(workWeekend => ({
                    ...workWeekend,
                    type: 'work_weekend',
                    sortDate: parseLocalDate(workWeekend.start_date),
                    // Map work weekend fields to reservation-like structure
                    family_group: workWeekend.proposing_family_group,
                    start_date: workWeekend.start_date,
                    end_date: workWeekend.end_date,
                    status: workWeekend.status
                  }))
              ];
              
              return upcomingItems
                .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
                .slice(0, 15)
                .map((item) => (
                 <div key={item.type === 'reservation' ? item.id : `work-weekend-${item.id}`} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                   <div className="flex items-center space-x-4">
                     <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                       item.type === 'work_weekend' 
                         ? 'bg-gradient-to-r from-green-500 to-green-600' 
                         : 'bg-gradient-to-r from-primary to-accent'
                     }`}>
                       {item.type === 'work_weekend' ? (
                         <Calendar className="h-5 w-5 text-white" />
                       ) : (
                         <User className="h-5 w-5 text-primary-foreground" />
                       )}
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         {(() => {
                           const familyGroup = familyGroups.find(fg => fg.name === item.family_group);
                           return familyGroup?.color && (
                             <div
                               className="w-3 h-3 rounded-full border border-border"
                               style={{ backgroundColor: familyGroup.color }}
                             />
                           );
                         })()}
                         <div className="font-medium">
                           {item.type === 'work_weekend' ? item.title : getHostFirstName(item)}
                         </div>
                         {item.type === 'work_weekend' && (
                           <Badge variant="outline" className="text-xs">Work Weekend</Badge>
                         )}
                       </div>
                       <div className="text-sm text-muted-foreground flex items-center">
                         <MapPin className="h-3 w-3 mr-1" />
                         {item.property_name || propertyName}
                       </div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {parseLocalDate(item.start_date).toLocaleDateString()} to {parseLocalDate(item.end_date).toLocaleDateString()}
                        </div>
                       {item.type === 'reservation' && item.nights_used && (
                         <div className="text-xs text-muted-foreground">
                           {item.nights_used} nights • Period #{item.time_period_number}
                         </div>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center space-x-2">
                     {item.type === 'reservation' ? (
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="outline" size="sm">
                             <Edit2 className="h-4 w-4 mr-1" />
                             Edit <ChevronDown className="h-3 w-3 ml-1" />
                           </Button>
                         </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setEditingReservation(item);
                              setShowBookingForm(true);
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Booking
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => {
                               setEditingReservation(item);
                               setShowSplitDialog(true);
                             }}>
                               <Calendar className="h-4 w-4 mr-2" />
                               Split into Periods
                             </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setReservationToDelete(item);
                                setShowDeleteDialog(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Reservation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                       </DropdownMenu>
                     ) : (
                       <Button variant="outline" size="sm" disabled>
                         <Calendar className="h-4 w-4 mr-1" />
                         Work Weekend
                       </Button>
                     )}
                     <Badge variant={item.status === "confirmed" || item.status === "fully_approved" ? "default" : "secondary"}>
                       {item.type === 'work_weekend' && item.status === 'fully_approved' ? 'approved' : item.status}
                     </Badge>
                   </div>
                 </div>
              ));
            })()}
            
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const next60Days = new Date(today);
              next60Days.setDate(today.getDate() + 60);
              
              const upcomingReservations = reservations.filter(reservation => {
                const startDate = parseLocalDate(reservation.start_date);
                return startDate >= today && startDate <= next60Days;
              });
              
              const upcomingWorkWeekends = workWeekends.filter(workWeekend => {
                const startDate = parseLocalDate(workWeekend.start_date);
                return startDate >= today && startDate <= next60Days;
              });
              
              const totalUpcoming = upcomingReservations.length + upcomingWorkWeekends.length;
              
              return totalUpcoming === 0;
            })() && (
              <div className="text-center text-muted-foreground py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming reservations or work weekends in the next 60 days</p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reservation for{" "}
              <strong>{reservationToDelete?.family_group}</strong> from{" "}
              {reservationToDelete && parseLocalDate(reservationToDelete.start_date).toLocaleDateString()} to{" "}
              {reservationToDelete && parseLocalDate(reservationToDelete.end_date).toLocaleDateString()}?
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteReservation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Work Weekend Detail Dialog */}
      <WorkWeekendDetailDialog
        workWeekend={selectedWorkWeekend}
        open={showWorkWeekendDetail}
        onOpenChange={setShowWorkWeekendDetail}
      />
    </div>
  );
});

PropertyCalendar.displayName = "PropertyCalendar";