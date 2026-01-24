import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar, Search, Eye, Users, Clock } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";
import { format } from "date-fns";
import { getHostFirstName } from "@/lib/reservation-utils";

export const ReservationLookup = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const { reservations, loading } = useReservations();

  // Extract unique years from reservations
  const availableYears = useMemo(() => {
    if (!reservations) return [];
    const years = new Set<number>();
    reservations.forEach((reservation) => {
      if (reservation.start_date) {
        const year = parseInt(reservation.start_date.split('-')[0]);
        if (!isNaN(year)) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  }, [reservations]);
  const navigate = useNavigate();

  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month - 1 because JS months are 0-indexed
  };

  const getShortReservationId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];

    return reservations.filter((reservation) => {
      // Year filter
      if (selectedYear !== "all" && reservation.start_date) {
        const reservationYear = reservation.start_date.split('-')[0];
        if (reservationYear !== selectedYear) return false;
      }

      // Search filter
      const searchLower = searchQuery.toLowerCase();
      if (!searchLower) return true;
      
      const displayName = getHostFirstName(reservation);
      return (
        reservation.family_group?.toLowerCase().includes(searchLower) ||
        displayName.toLowerCase().includes(searchLower) ||
        reservation.id?.toLowerCase().includes(searchLower) ||
        reservation.property_name?.toLowerCase().includes(searchLower) ||
        reservation.status?.toLowerCase().includes(searchLower)
      );
    });
  }, [reservations, searchQuery, selectedYear]);

  const formatDate = (date: string) => {
    try {
      return format(parseLocalDate(date), 'MMM d, yyyy');
    } catch {
      return date;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const calculateNights = (startDate: string, endDate: string) => {
    try {
      if (!startDate || !endDate) return 'N/A';
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 'N/A';
    }
  };

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (value: any, reservation: any) => (
        <span className="font-mono text-xs">{getShortReservationId(reservation?.id || '')}</span>
      )
    },
    {
      key: 'family_group',
      title: 'Family Group',
      className: 'font-medium',
      render: (value: any, reservation: any) => getHostFirstName(reservation)
    },
    {
      key: 'dates',
      title: 'Stay Dates',
      render: (value: any, reservation: any) => {
        if (!reservation || !reservation.start_date || !reservation.end_date) {
          return <div className="text-sm text-muted-foreground">No dates available</div>;
        }
        return (
          <div className="space-y-1">
            <div className="text-sm">{formatDate(reservation.start_date)} - {formatDate(reservation.end_date)}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {calculateNights(reservation.start_date, reservation.end_date)} nights
            </div>
          </div>
        );
      }
    },
    {
      key: 'property_name',
      title: 'Property',
      render: (value: any, reservation: any) => reservation?.property_name || 'Main Cabin'
    },
    {
      key: 'guest_count',
      title: 'Guests',
      render: (value: any, reservation: any) => reservation?.guest_count ? (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {reservation.guest_count}
        </div>
      ) : 'N/A'
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: any, reservation: any) => (
        <Badge className={getStatusColor(reservation?.status)}>
          {reservation?.status || 'Confirmed'}
        </Badge>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, reservation: any) => reservation?.id ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/reservation/${reservation.id}`)}
          className="text-xs"
        >
          <Eye className="mr-1 h-3 w-3" />
          View Details
        </Button>
      ) : null
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Reservation Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            placeholder="Search by family group, reservation ID, property, or status..."
            onSearch={setSearchQuery}
            className="flex-1 max-w-md"
          />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredReservations}
          columns={columns}
          loading={loading}
          emptyState={{
            icon: <Calendar className="h-8 w-8" />,
            title: "No Reservations Found",
            description: searchQuery 
              ? "No reservations match your search criteria. Try adjusting your search terms."
              : "No reservations have been created yet.",
          }}
        />

        {filteredReservations.length > 0 && (
          <div className="text-sm text-muted-foreground text-center pt-2">
            Showing {filteredReservations.length} of {reservations?.length || 0} reservations
          </div>
        )}
      </CardContent>
    </Card>
  );
};