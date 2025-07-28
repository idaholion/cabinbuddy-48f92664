import { useState } from "react";
import { Calendar, MapPin, User, Clock, ChevronDown, Edit2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useReservations } from "@/hooks/useReservations";
import { useTimePeriods } from "@/hooks/useTimePeriods";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { BookingForm } from "@/components/BookingForm";
import { TradeRequestForm } from "@/components/TradeRequestForm";

interface PropertyCalendarProps {
  onMonthChange?: (date: Date) => void;
}

export const PropertyCalendar = ({ onMonthChange }: PropertyCalendarProps) => {
  const { reservationSettings } = useReservationSettings();
  const { reservations, refetchReservations } = useReservations();
  const { calculateTimePeriodWindows, timePeriodUsage } = useTimePeriods();
  const { rotationData } = useRotationOrder();
  
  const [selectedProperty, setSelectedProperty] = useState("property");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);

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
      // TODO: Implement calendar keeper assistance request
      console.log('Request calendar keeper assistance - to be implemented');
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
    return reservations.filter(reservation => {
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      return date >= startDate && date <= endDate;
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
              <Button onClick={() => setShowBookingForm(true)}>
                New Booking
              </Button>
              <Button variant="outline" onClick={handleBookingComplete}>
                Booking Complete
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Edit Booking <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => handleEditBookingAction('edit-my-bookings')}>
                    Edit my bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditBookingAction('request-trade')}>
                    Request trade with another group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditBookingAction('request-assistance')}>
                    Request Calendar Keeper assistance
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayBookings = getBookingsForDate(day);
              const timePeriod = getTimePeriodForDate(day);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`min-h-20 p-1 border border-border relative ${
                    !isCurrentMonth ? 'bg-muted/50' : 'bg-background'
                  } ${isToday ? 'ring-2 ring-primary' : ''} ${
                    timePeriod ? 'border-l-4 border-l-accent' : ''
                  } hover:bg-accent/10 transition-colors cursor-pointer`}
                >
                  <div className={`text-sm font-medium ${
                    !isCurrentMonth ? 'text-muted-foreground' : isToday ? 'text-primary' : 'text-foreground'
                  }`}>
                    {day.getDate()}
                  </div>
                  
                  {/* Time period indicator */}
                  {timePeriod && isCurrentMonth && (
                    <div className="text-xs text-muted-foreground mb-1 truncate">
                      {timePeriod.familyGroup}
                    </div>
                  )}
                  
                  {/* Bookings */}
                  <div className="mt-1 space-y-1">
                    {dayBookings.slice(0, 2).map((booking, i) => (
                      <div
                        key={i}
                        className={`text-xs px-1 py-0.5 rounded truncate ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {booking.family_group}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                       <div className="font-medium">{reservation.family_group}</div>
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
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         setEditingReservation(reservation);
                         setShowBookingForm(true);
                       }}
                     >
                       <Edit2 className="h-4 w-4 mr-1" />
                       Edit
                     </Button>
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

      {/* Trade Request Form Dialog */}
      <TradeRequestForm 
        open={showTradeForm}
        onOpenChange={setShowTradeForm}
        onTradeComplete={handleBookingComplete}
      />
    </div>
  );
};