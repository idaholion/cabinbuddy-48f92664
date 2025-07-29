import { useState } from "react";
import { Calendar, MapPin, User, Clock, ChevronDown, Edit2, Filter, Eye, EyeOff, ArrowLeftRight, Layers, Users, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
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
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useTradeRequests } from "@/hooks/useTradeRequests";

interface PropertyCalendarProps {
  onMonthChange?: (date: Date) => void;
}

export const PropertyCalendar = ({ onMonthChange }: PropertyCalendarProps) => {
  const { user } = useAuth();
  const { reservationSettings } = useReservationSettings();
  const { reservations, refetchReservations } = useReservations();
  const { calculateTimePeriodWindows, timePeriodUsage } = useTimePeriods();
  const { rotationData } = useRotationOrder();
  const { familyGroups } = useFamilyGroups();
  const { tradeRequests } = useTradeRequests();
  
  const [selectedProperty, setSelectedProperty] = useState("property");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showMultiPeriodForm, setShowMultiPeriodForm] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  
  // Phase 4: Enhanced filtering and view options
  const [filterOptions, setFilterOptions] = useState({
    showMyBookings: true,
    showOtherBookings: true,
    showTimePeriods: true,
    showTradeRequests: true,
    familyGroupFilter: 'all'
  });
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'timeline'>('calendar');
  const [searchQuery, setSearchQuery] = useState("");

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

  const getBookingsForDate = (date: Date) => {
    const allBookings = reservations.filter(reservation => {
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      return date >= startDate && date <= endDate;
    });

    // Phase 4: Apply filtering
    return allBookings.filter(booking => {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Phase 4: View Mode Toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button 
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="rounded-none"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'timeline' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="rounded-none"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Phase 4: Filter Dropdown */}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    New Booking <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setShowBookingForm(true)}>
                    Single Period Booking
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowMultiPeriodForm(true)}>
                    Multi-Period Booking
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={handleBookingComplete}>
                Booking Complete
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="relative">
                    Edit Booking <ChevronDown className="h-4 w-4 ml-1" />
                    {pendingTradeRequests > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                        {pendingTradeRequests}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => handleEditBookingAction('edit-my-bookings')}>
                    Edit my bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditBookingAction('request-trade')}>
                    Request trade with another group
                  </DropdownMenuItem>
                  <CalendarKeeperAssistanceDialog>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Request Calendar Keeper assistance
                    </DropdownMenuItem>
                  </CalendarKeeperAssistanceDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center space-x-4">
              <SearchInput
                placeholder="Search reservations, family groups..."
                onSearch={setSearchQuery}
                className="w-64"
              />
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                  ←
                </Button>
                <h3 className="text-xl font-semibold">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                  →
                </Button>
              </div>
            </div>
          </div>
          
          {/* Family Group Color Legend */}
          {familyGroups.some(fg => fg.color) && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Family Group Colors</h4>
              <div className="flex flex-wrap gap-3">
                {familyGroups
                  .filter(fg => fg.color)
                  .map(familyGroup => (
                    <div key={familyGroup.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: familyGroup.color }}
                      />
                      <span className="text-xs text-muted-foreground">{familyGroup.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Enhanced Calendar Grid */}
          {viewMode === 'calendar' && (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayBookings = getBookingsForDate(day);
                const timePeriod = getTimePeriodForDate(day);
                const tradeRequests = getTradeRequestsForDate(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const hasMyBooking = dayBookings.some(b => b.family_group === userFamilyGroup);
                const hasPendingTrade = tradeRequests.length > 0 && filterOptions.showTradeRequests;
                
                return (
                  <div
                    key={index}
                    className={`min-h-24 p-1 border border-border relative transition-all duration-200 ${
                      !isCurrentMonth ? 'bg-muted/50' : 'bg-background'
                    } ${isToday ? 'ring-2 ring-primary shadow-warm' : ''} ${
                      timePeriod && filterOptions.showTimePeriods ? 'border-l-4 border-l-accent' : ''
                    } ${
                      hasMyBooking ? 'bg-primary/5 border-primary/20' : ''
                    } ${
                      hasPendingTrade ? 'bg-destructive/5 border-destructive/20' : ''
                    } hover:bg-accent/10 hover:shadow-cabin cursor-pointer group`}
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
                    
                    {/* Enhanced bookings display */}
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
    </div>
  );
};