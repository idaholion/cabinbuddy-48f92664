
import { useState, useEffect } from "react";
import { Calendar, MapPin, User, Clock, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useReservations } from "@/hooks/useReservations";

interface PropertyCalendarProps {
  onMonthChange?: (date: Date) => void;
}

export const PropertyCalendar = ({ onMonthChange }: PropertyCalendarProps) => {
  const { reservationSettings } = useReservationSettings();
  const { createReservation, loading } = useReservations();
  const [selectedProperty, setSelectedProperty] = useState("property");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get property name from database or use fallback
  const propertyName = reservationSettings?.property_name || "Property";
  
  const properties = [
    { id: "property", name: propertyName, location: reservationSettings?.address || "Location not set" }
  ];

  // Handle booking complete - save mock data for demonstration
  const handleBookingComplete = async () => {
    const mockReservation = {
      start_date: "2024-12-15",
      end_date: "2024-12-17",
      family_group: "Smith Family",
      guest_count: 4,
      property_name: propertyName,
      status: "confirmed"
    };
    
    await createReservation(mockReservation);
  };

  const handleEditBookingAction = (action: string) => {
    console.log(`Edit booking action: ${action}`);
    // TODO: Implement specific actions for each menu item
  };

  const bookings = [
    { id: 1, property: propertyName, user: "Sarah M.", startDate: "2024-12-15", endDate: "2024-12-17", status: "confirmed" },
    { id: 2, property: propertyName, user: "Mike R.", startDate: "2024-12-20", endDate: "2024-12-22", status: "pending" },
    { id: 3, property: propertyName, user: "Lisa K.", startDate: "2024-12-25", endDate: "2024-12-30", status: "confirmed" },
    { id: 4, property: propertyName, user: "Tom B.", startDate: "2024-12-28", endDate: "2024-12-31", status: "confirmed" }
  ];

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
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      return date >= start && date <= end;
    });
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
              <Button>New Booking</Button>
              <Button variant="outline" onClick={handleBookingComplete} disabled={loading}>
                {loading ? "Saving..." : "Booking Complete"}
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

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayBookings = getBookingsForDate(day);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`min-h-20 p-1 border border-gray-200 ${
                    !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''} hover:bg-blue-50 transition-colors cursor-pointer`}
                >
                  <div className={`text-sm font-medium ${
                    !isCurrentMonth ? 'text-gray-400' : isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayBookings.slice(0, 2).map((booking, i) => (
                      <div
                        key={i}
                        className={`text-xs px-1 py-0.5 rounded truncate ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {booking.property}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-gray-500">
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
          <CardDescription>Next 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{booking.user}</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {booking.property}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {booking.startDate} to {booking.endDate}
                    </div>
                  </div>
                </div>
                <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
