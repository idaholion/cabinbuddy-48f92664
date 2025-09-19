import { useState, useEffect } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useNotifications } from "@/hooks/useNotifications";
import { getHostFirstName, getHostEmail } from "@/lib/reservation-utils";

const REMINDER_TYPES = [
  { value: 'reminder_7', label: '7-Day Reminder', days: 7 },
  { value: 'reminder_3', label: '3-Day Reminder', days: 3 },
  { value: 'reminder_1', label: '1-Day Reminder', days: 1 },
  { value: 'confirmation', label: 'Confirmation Email', days: null },
  { value: 'cancellation', label: 'Cancellation Email', days: null },
];

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
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [selectedReminderTypes, setSelectedReminderTypes] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { sendNotification } = useNotifications();

  // Fetch upcoming reservations
  useEffect(() => {
    if (organization?.id) {
      fetchUpcomingReservations();
    }
  }, [organization?.id]);

  // Add real-time subscription for reservation changes
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('notification-reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('Real-time reservation change in notifications:', payload);
          // Refetch upcoming reservations to show latest data
          fetchUpcomingReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          end_date,
          host_assignments
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
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        checkInDate.setHours(0, 0, 0, 0); // Reset time to start of day
        const timeDiff = checkInDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Get host email if available, otherwise fallback to family group lead
        const hostEmail = getHostEmail(reservation);
        
        // Find matching family group for fallback contact info
        const familyGroup = familyGroups?.find(fg => fg.name === reservation.family_group);
        
        // Use host email if available, otherwise family group lead email
        const contactEmail = hostEmail || familyGroup?.lead_email || '';
        
        // Get display name (host first name or family group name)
        const displayName = getHostFirstName(reservation);

        return {
          id: reservation.id,
          family_group: displayName, // Use host name for display
          start_date: reservation.start_date,
          end_date: reservation.end_date,
          guest_email: contactEmail,
          guest_name: displayName,
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


  const getReminderBadgeVariant = (daysUntil: number) => {
    if (daysUntil <= 1) return "destructive";
    if (daysUntil <= 3) return "default";
    if (daysUntil <= 7) return "secondary";
    return "outline";
  };

  const handleSendReminder = async (reservation: UpcomingReservation) => {
    const reminderType = selectedReminderTypes[reservation.id] || 'reminder_3';
    const selectedType = REMINDER_TYPES.find(t => t.value === reminderType);
    
    setSendingReminder(reservation.id);
    
    // Map reminder types to valid notification types
    let notificationType: 'reminder' | 'confirmation' | 'cancellation';
    if (reminderType.startsWith('reminder_')) {
      notificationType = 'reminder';
    } else if (reminderType === 'confirmation') {
      notificationType = 'confirmation';
    } else if (reminderType === 'cancellation') {
      notificationType = 'cancellation';
    } else {
      notificationType = 'reminder'; // fallback
    }
    
    const success = await sendNotification(
      notificationType,
      {
        id: reservation.id,
        family_group_name: reservation.family_group,
        check_in_date: reservation.start_date,
        check_out_date: reservation.end_date,
        guest_email: reservation.guest_email,
        guest_name: reservation.guest_name,
      }, 
      selectedType?.days || reservation.days_until
    );
    
    setSendingReminder(null);
  };

  const handleReminderTypeChange = (reservationId: string, reminderType: string) => {
    setSelectedReminderTypes(prev => ({
      ...prev,
      [reservationId]: reminderType
    }));
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reservations</CardTitle>
          <CardDescription className="text-base">
            Families with upcoming stays who will receive automatic reminders
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
                      <div className="flex items-center space-x-2 ml-4">
                        <Select
                          value={selectedReminderTypes[reservation.id] || 'reminder_3'}
                          onValueChange={(value) => handleReminderTypeChange(reservation.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select reminder type" />
                          </SelectTrigger>
                          <SelectContent>
                            {REMINDER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => handleSendReminder(reservation)}
                          disabled={sendingReminder === reservation.id}
                          size="sm"
                        >
                          {sendingReminder === reservation.id ? (
                            "Sending..."
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </>
                          )}
                        </Button>
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