import { useState, useEffect } from "react";
import { Bell, Send, Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface UpcomingReservation {
  id: string;
  family_group: string;
  start_date: string;
  end_date: string;
  guest_email: string;
  guest_name: string;
  guest_phone?: string;
  days_until: number;
}

export const NotificationManagement = () => {
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  // Fetch upcoming reservations
  useEffect(() => {
    if (organization?.id) {
      fetchUpcomingReservations();
    }
  }, [organization?.id]);

  const fetchUpcomingReservations = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
          id,
          family_group,
          start_date,
          end_date
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('start_date', today)
        .lte('start_date', thirtyDaysFromNow)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching reservations:', error);
        toast({
          title: "Error",
          description: "Failed to fetch upcoming reservations",
          variant: "destructive",
        });
        return;
      }

      // Get family groups data separately
      const { data: familyGroups, error: familyError } = await supabase
        .from('family_groups')
        .select('name, lead_email, lead_name, lead_phone')
        .eq('organization_id', organization.id);

      if (familyError) {
        console.error('Error fetching family groups:', familyError);
      }

      const processedReservations = reservations?.map(reservation => {
        const checkInDate = new Date(reservation.start_date);
        const today = new Date();
        const timeDiff = checkInDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Find matching family group
        const familyGroup = familyGroups?.find(fg => fg.name === reservation.family_group);

        return {
          id: reservation.id,
          family_group: reservation.family_group,
          start_date: reservation.start_date,
          end_date: reservation.end_date,
          guest_email: familyGroup?.lead_email || '',
          guest_name: familyGroup?.lead_name || '',
          guest_phone: familyGroup?.lead_phone || undefined,
          days_until: daysUntil
        };
      }) || [];

      setUpcomingReservations(processedReservations);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendManualReminder = async (reservation: UpcomingReservation, daysOut: number) => {
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'reminder',
          reservation: {
            id: reservation.id,
            family_group_name: reservation.family_group,
            check_in_date: reservation.start_date,
            check_out_date: reservation.end_date,
            guest_email: reservation.guest_email,
            guest_name: reservation.guest_name,
            guest_phone: reservation.guest_phone,
          },
          days_until: daysOut,
          pre_arrival_checklist: {
            seven_day: [
              'Review shopping list and coordinate with other families',
              'Check weather forecast for packing',
              'Share guest information packet with friends/family joining',
              'Review cabin rules and policies',
              'Plan transportation and confirm directions'
            ],
            three_day: [
              'Final review of shopping list',
              'Confirm arrival time with calendar keeper if needed',
              'Pack according to weather forecast',
              'Double-check emergency contact information',
              'Review check-in procedures'
            ],
            one_day: [
              'Final weather check and packing adjustments',
              'Confirm departure time and route',
              'Ensure all guests have cabin address and WiFi info',
              'Last-minute coordination with other families',
              'Emergency contacts saved in phone'
            ]
          }
        }
      });

      if (error) {
        toast({
          title: "Failed to Send Reminder",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Reminder Sent",
        description: `${daysOut}-day reminder sent to ${reservation.family_group}`,
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder notification",
        variant: "destructive",
      });
    }
  };

  const runAutomaticReminders = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-reminder-notifications');
      
      if (error) {
        toast({
          title: "Failed to Run Reminders",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Automatic Reminders Sent",
        description: "All scheduled reminder notifications have been processed",
      });
    } catch (error) {
      console.error('Error running automatic reminders:', error);
      toast({
        title: "Error",
        description: "Failed to run automatic reminder system",
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
    }
  };

  const getReminderBadgeVariant = (daysUntil: number) => {
    if (daysUntil <= 1) return "destructive";
    if (daysUntil <= 3) return "default";
    if (daysUntil <= 7) return "secondary";
    return "outline";
  };

  const getAvailableReminderDays = (daysUntil: number) => {
    const reminderDays = [7, 3, 1];
    return reminderDays.filter(days => days <= daysUntil);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <div>
                <CardTitle>Notification Management</CardTitle>
                <CardDescription className="text-base">
                  Send manual reminders and manage the automatic notification system
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={runAutomaticReminders}
              disabled={sendingReminders}
              className="flex items-center space-x-2 text-base"
            >
              <Send className="h-4 w-4" />
              <span>{sendingReminders ? "Processing..." : "Run All Reminders"}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-base font-medium">7-Day Reminders</span>
                  </div>
                  <p className="text-base text-muted-foreground mt-1">
                    Pre-planning checklist
                  </p>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-base font-medium">3-Day Reminders</span>
                  </div>
                  <p className="text-base text-muted-foreground mt-1">
                    Final preparations
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-red-600" />
                    <span className="text-base font-medium">1-Day Reminders</span>
                  </div>
                  <p className="text-base text-muted-foreground mt-1">
                    Last-minute details
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reservations</CardTitle>
          <CardDescription className="text-base">
            Send manual reminders to families with upcoming stays
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-base">Loading upcoming reservations...</p>
            </div>
          ) : upcomingReservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-base">No upcoming reservations in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingReservations.map((reservation) => (
                <Card key={reservation.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{reservation.family_group}</h4>
                          <Badge variant={getReminderBadgeVariant(reservation.days_until)}>
                            {reservation.days_until} day{reservation.days_until !== 1 ? 's' : ''} away
                          </Badge>
                        </div>
                        <p className="text-base text-muted-foreground mt-1">
                          {new Date(reservation.start_date).toLocaleDateString()} - {new Date(reservation.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-base text-muted-foreground">
                          {reservation.guest_name} • {reservation.guest_email}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {getAvailableReminderDays(reservation.days_until).map((days) => (
                          <Button
                            key={days}
                            variant="outline"
                            size="sm"
                            onClick={() => sendManualReminder(reservation, days)}
                            className="flex items-center space-x-1 text-base"
                          >
                            <Send className="h-3 w-3" />
                            <span>{days}d</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};