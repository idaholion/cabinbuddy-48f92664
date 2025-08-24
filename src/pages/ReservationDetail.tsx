import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, Calendar, Users, DollarSign, MapPin, Clock, User } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ReservationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reservations, loading } = useReservations();
  const { toast } = useToast();
  const [reservation, setReservation] = useState<any>(null);

  useEffect(() => {
    document.title = "Reservation Details";
  }, []);

  useEffect(() => {
    if (!loading && reservations && Array.isArray(reservations) && id) {
      const foundReservation = reservations.find(r => r.id === id);
      if (foundReservation) {
        setReservation(foundReservation);
        document.title = `Reservation ${foundReservation.family_group} - Details`;
      } else if (reservations.length > 0) {
        // Only show error if we have reservations but couldn't find this one
        toast({
          title: "Reservation Not Found",
          description: "The requested reservation could not be found.",
          variant: "destructive",
        });
      }
    }
  }, [id, reservations, loading, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" 
           style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat" 
           style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <h2 className="text-xl font-semibold">Reservation Not Found</h2>
              <p className="text-muted-foreground">The reservation you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'EEEE, MMMM d, yyyy');
    } catch {
      return date;
    }
  };

  const calculateNights = () => {
    try {
      const start = new Date(reservation.start_date);
      const end = new Date(reservation.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return reservation.nights_used || 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" 
         style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <header className="sr-only">
        <h1>Reservation Details for {reservation.family_group}</h1>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Button onClick={() => navigate(-1)} variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <PageHeader
            title={`Reservation Details`}
            subtitle={`${reservation.family_group} - ${reservation.property_name || 'Cabin Stay'}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Reservation Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={getStatusColor(reservation.status)}>
                  {reservation.status || 'Confirmed'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reservation ID</span>
                <span className="font-mono text-sm">{reservation.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Family Group</span>
                <span className="font-medium">{reservation.family_group}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Property</span>
                <span>{reservation.property_name || 'Main Cabin'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Dates & Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Stay Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Check-in Date</span>
                <p className="font-medium">{formatDate(reservation.start_date)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Check-out Date</span>
                <p className="font-medium">{formatDate(reservation.end_date)}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">{calculateNights()} nights</span>
              </div>
              {reservation.guest_count && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Guests</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {reservation.guest_count}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          {reservation.total_cost && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Cost</span>
                  <span className="font-medium text-lg">${reservation.total_cost}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Host Assignments */}
          {reservation.host_assignments && reservation.host_assignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Host Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reservation.host_assignments.map((assignment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{assignment.host_name || 'Assigned Host'}</span>
                      <Badge variant="secondary" className="text-xs">
                        {assignment.role || 'Host'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Allocation Information */}
          {(reservation.allocated_start_date || reservation.time_period_number) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Allocation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reservation.time_period_number && (
                  <div>
                    <span className="text-sm text-muted-foreground">Time Period</span>
                    <p className="font-medium">Period #{reservation.time_period_number}</p>
                  </div>
                )}
                {reservation.allocated_start_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">Allocated Start</span>
                    <p className="font-medium">{formatDate(reservation.allocated_start_date)}</p>
                  </div>
                )}
                {reservation.allocated_end_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">Allocated End</span>
                    <p className="font-medium">{formatDate(reservation.allocated_end_date)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => navigate('/calendar')} variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                View Calendar
              </Button>
              <Button onClick={() => navigate('/calendar-keeper-management')} variant="outline">
                Manage Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ReservationDetail;