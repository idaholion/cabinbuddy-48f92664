import { useState, useEffect } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle2, Send, Users, Hammer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useNotifications } from "@/hooks/useNotifications";
import { useTimePeriods } from "@/hooks/useTimePeriods";
import { useWorkWeekends } from "@/hooks/useWorkWeekends";
import { useReservationPeriods } from "@/hooks/useReservationPeriods";
import { useSequentialSelection } from "@/hooks/useSequentialSelection";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { getHostFirstName, getHostEmail } from "@/lib/reservation-utils";
import { getSelectionPeriodDisplayInfo } from "@/lib/selection-period-utils";
import type { SelectionPeriodDisplayInfo } from "@/lib/selection-period-utils";

interface ReservationPeriod {
  id: string;
  organization_id: string;
  rotation_year: number;
  current_family_group: string;
  current_group_index: number;
  selection_start_date: string;
  selection_end_date: string;
  reservations_completed: boolean | null;
  created_at: string;
  updated_at: string;
}

const REMINDER_TYPES = [
  { value: 'reminder_7', label: '7-Day Reminder', days: 7 },
  { value: 'reminder_3', label: '3-Day Reminder', days: 3 },
  { value: 'reminder_1', label: '1-Day Reminder', days: 1 },
  { value: 'confirmation', label: 'Confirmation Email', days: null },
  { value: 'cancellation', label: 'Cancellation Email', days: null },
];

const SELECTION_REMINDER_TYPES = [
  { value: 'selection_start', label: 'Selection Period Starting', days: null },
  { value: 'selection_reminder', label: 'Selection Reminder', days: null },
  { value: 'selection_ending', label: 'Selection Period Ending', days: null },
];

const WORK_WEEKEND_REMINDER_TYPES = [
  { value: 'work_weekend_reminder', label: 'Work Weekend Reminder', days: null },
  { value: 'work_weekend_invitation', label: 'Send Invitation', days: null },
];

interface UpcomingEvent {
  id: string;
  type: 'reservation' | 'selection_period' | 'work_weekend';
  title: string;
  subtitle?: string;
  start_date: string;
  end_date: string;
  contact_email: string;
  contact_name: string;
  contact_phone?: string;
  days_until: number;
  status?: string;
  family_group?: string;
  description?: string;
}

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
  const [upcomingSelectionPeriods, setUpcomingSelectionPeriods] = useState<SelectionPeriodDisplayInfo[]>([]);
  const [upcomingWorkWeekends, setUpcomingWorkWeekends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [selectedReminderTypes, setSelectedReminderTypes] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { sendNotification } = useNotifications();
  const { calculateTimePeriodWindows } = useTimePeriods();
  const { workWeekends } = useWorkWeekends();
  const { getUpcomingSelectionPeriods, periods, loading: periodsLoading } = useReservationPeriods();
  const { getSelectionRotationYear, rotationData, loading: rotationLoading } = useRotationOrder();
  
  // Use centralized rotation year calculation that matches Calendar page
  // Wait for rotationData to load before calculating year
  const rotationYear = rotationData ? getSelectionRotationYear() : new Date().getFullYear();
  const { currentFamilyGroup, getDaysRemaining } = useSequentialSelection(rotationYear);

  // Utility function to parse date strings without timezone conversion
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month - 1 because JS months are 0-indexed
  };

  // Fetch upcoming events
  useEffect(() => {
    if (organization?.id) {
      fetchUpcomingReservations();
      fetchUpcomingSelectionPeriods();
      console.log('Organization loaded, fetching selection periods');
    }
  }, [organization?.id]); // Remove getUpcomingSelectionPeriods dependency to prevent infinite loop

  // Fetch selection periods when periods data is loaded
  useEffect(() => {
    if (!periodsLoading && periods.length > 0) {
      fetchUpcomingSelectionPeriods();
    }
  }, [periods, periodsLoading]);

  // Sync work weekends from hook
  useEffect(() => {
    if (workWeekends) {
      const upcoming = workWeekends.filter(ww => {
        const startDate = parseLocalDate(ww.start_date);
        const today = new Date();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return startDate >= today && startDate <= thirtyDaysFromNow;
      });
      setUpcomingWorkWeekends(upcoming);
    }
  }, [workWeekends]);

  // Add real-time subscriptions for all event types
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('notification-events-changes')
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
          // Debounce the fetch call to prevent rapid-fire calls
          setTimeout(() => {
            if (!isFetching) {
              fetchUpcomingReservations();
            }
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_periods',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('Real-time selection period change in notifications:', payload);
          // Debounce the fetch call to prevent rapid-fire calls
          setTimeout(() => {
            fetchUpcomingSelectionPeriods();
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_weekends',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('Real-time work weekend change in notifications:', payload);
          // Work weekends are managed by the hook, no need to fetch separately
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  const fetchUpcomingReservations = async () => {
    if (!organization?.id || isFetching) return;
    
    setIsFetching(true);
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
        // Don't show toast for network errors to prevent flashing
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
        // Parse date string properly to avoid timezone issues
        const parseLocalDate = (dateStr: string): Date => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day); // month - 1 because JS months are 0-indexed
        };

        const checkInDate = parseLocalDate(reservation.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        const timeDiff = checkInDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Get host email if available, otherwise fallback to family group lead
        const hostEmail = getHostEmail(reservation);
        
        // Find matching family group for fallback contact info
        const familyGroup = familyGroups?.find(fg => fg.name === reservation.family_group);
        
        // Prioritize family group lead email over host email if:
        // 1. Host email appears to be test data (contains @example.com)
        // 2. Family group has a valid lead email
        const isTestEmail = hostEmail && hostEmail.includes('@example.com');
        const useHostEmail = hostEmail && !isTestEmail && familyGroup?.lead_email !== hostEmail;
        const contactEmail = useHostEmail ? hostEmail : (familyGroup?.lead_email || hostEmail || '');
        
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
      // Don't show toast for network errors to prevent flashing
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchUpcomingSelectionPeriods = () => {
    // Pass currentFamilyGroup so it includes the active family even if scheduled date is far out
    const scheduledPeriods = getUpcomingSelectionPeriods(currentFamilyGroup || undefined);
    
    // Merge scheduled periods with actual sequential selection status
    const displayInfo = getSelectionPeriodDisplayInfo(
      scheduledPeriods,
      currentFamilyGroup,
      getDaysRemaining
    );
    
    // Filter to only show active or upcoming
    const upcoming = displayInfo.filter(info => 
      info.status === 'active' || info.status === 'scheduled'
    );
    
    setUpcomingSelectionPeriods(upcoming);
  };


  const getReminderBadgeVariant = (daysUntil: number) => {
    if (daysUntil <= 1) return "destructive";
    if (daysUntil <= 3) return "default";
    if (daysUntil <= 7) return "secondary";
    return "outline";
  };

  const handleSendEventNotification = async (event: UpcomingEvent) => {
    const reminderType = selectedReminderTypes[event.id];
    if (!reminderType) return;
    
    setSendingReminder(event.id);
    
    try {
      if (event.type === 'work_weekend') {
        // Handle work weekend notifications
        await supabase.functions.invoke('send-work-weekend-notifications', {
          body: {
            work_weekend_id: event.id,
            notification_type: reminderType,
            organization_id: organization?.id
          }
        });
        toast({
          title: "Notification Sent",
          description: "Work weekend notification sent successfully",
        });
      }
      // Note: Selection period notifications are now handled automatically by the system
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
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

  // Convert events to unified format for easier display
  const convertToUnifiedEvents = (): UpcomingEvent[] => {
    const events: UpcomingEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add reservations
    upcomingReservations.forEach(reservation => {
      events.push({
        id: reservation.id,
        type: 'reservation',
        title: `${reservation.family_group} Reservation`,
        subtitle: `Check-in: ${parseLocalDate(reservation.start_date).toLocaleDateString()}`,
        start_date: reservation.start_date,
        end_date: reservation.end_date,
        contact_email: reservation.guest_email,
        contact_name: reservation.guest_name,
        contact_phone: reservation.guest_phone,
        days_until: reservation.days_until,
        family_group: reservation.family_group
      });
    });

    // Add selection periods with actual status
    upcomingSelectionPeriods.forEach(period => {
      const daysUntil = period.isCurrentlyActive ? 0 : period.daysUntilScheduled;
      
      let subtitle = '';
      if (period.isCurrentlyActive) {
        const daysRemainingText = period.daysRemaining !== undefined 
          ? ` (${period.daysRemaining} days remaining)`
          : '';
        subtitle = `Active Now${daysRemainingText}`;
        
        // Show original scheduled dates if started early
        if (period.daysUntilScheduled > 0) {
          const scheduledStart = parseLocalDate(period.scheduledStartDate);
          subtitle += ` - Originally scheduled for ${scheduledStart.toLocaleDateString()}`;
        }
      } else {
        const scheduledStart = parseLocalDate(period.scheduledStartDate);
        const scheduledEnd = parseLocalDate(period.scheduledEndDate);
        subtitle = `Scheduled: ${scheduledStart.toLocaleDateString()} to ${scheduledEnd.toLocaleDateString()}`;
      }

      const event: UpcomingEvent = {
        id: `selection-${period.familyGroup}`,
        type: 'selection_period',
        title: `${period.familyGroup} Selection Period`,
        subtitle,
        start_date: period.scheduledStartDate,
        end_date: period.scheduledEndDate,
        contact_email: '',
        contact_name: period.familyGroup,
        days_until: daysUntil,
        family_group: period.familyGroup
      };
      events.push(event);
    });

    // Add work weekends
    upcomingWorkWeekends.forEach(workWeekend => {
      const startDate = parseLocalDate(workWeekend.start_date);
      const timeDiff = startDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

      events.push({
        id: workWeekend.id,
        type: 'work_weekend',
        title: workWeekend.title,
        subtitle: `Proposed by ${workWeekend.proposer_name}`,
        start_date: workWeekend.start_date,
        end_date: workWeekend.end_date,
        contact_email: workWeekend.proposer_email,
        contact_name: workWeekend.proposer_name,
        days_until: daysUntil,
        status: workWeekend.status,
        description: workWeekend.description,
        family_group: workWeekend.proposer_family_group
      });
    });

    return events.sort((a, b) => a.days_until - b.days_until);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'reservation': return <Calendar className="h-4 w-4" />;
      case 'selection_period': return <Users className="h-4 w-4" />;
      case 'work_weekend': return <Hammer className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getReminderOptions = (eventType: string) => {
    switch (eventType) {
      case 'reservation': return REMINDER_TYPES;
      case 'selection_period': return SELECTION_REMINDER_TYPES;
      case 'work_weekend': return WORK_WEEKEND_REMINDER_TYPES;
      default: return REMINDER_TYPES;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="selections">Selection Periods</TabsTrigger>
          <TabsTrigger value="work-weekends">Work Weekends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Upcoming Events</CardTitle>
              <CardDescription className="text-base">
                Complete view of upcoming reservations, selection periods, and work weekends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-base">Loading upcoming events...</p>
                </div>
              ) : (
                (() => {
                  const allEvents = convertToUnifiedEvents();
                  return allEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-base">No upcoming events in the next 30 days</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allEvents.map((event) => (
                        <Card key={`${event.type}-${event.id}`} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  {getEventIcon(event.type)}
                                  <h4 className="font-medium">{event.title}</h4>
                                  <Badge variant={getReminderBadgeVariant(event.days_until)}>
                                    {event.days_until} day{event.days_until !== 1 ? 's' : ''} away
                                  </Badge>
                                  {event.status && (
                                    <Badge variant="outline">{event.status}</Badge>
                                  )}
                                </div>
                                {event.subtitle && (
                                  <p className="text-sm text-muted-foreground mt-1">{event.subtitle}</p>
                                )}
                                <p className="text-base text-muted-foreground mt-1">
                                  {parseLocalDate(event.start_date).toLocaleDateString()} - {parseLocalDate(event.end_date).toLocaleDateString()}
                                </p>
                                {event.contact_name && event.contact_email && (
                                  <p className="text-base text-muted-foreground">
                                    {event.contact_name} • {event.contact_email}
                                  </p>
                                )}
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <Select
                                  value={selectedReminderTypes[event.id] || ''}
                                  onValueChange={(value) => handleReminderTypeChange(event.id, value)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select notification type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getReminderOptions(event.type).map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  onClick={() => event.type === 'reservation' 
                                    ? handleSendReminder(upcomingReservations.find(r => r.id === event.id)!)
                                    : handleSendEventNotification(event)
                                  }
                                  disabled={sendingReminder === event.id || !selectedReminderTypes[event.id]}
                                  size="sm"
                                >
                                  {sendingReminder === event.id ? (
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
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations">
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
                              <Calendar className="h-4 w-4" />
                              <h4 className="font-medium">{reservation.family_group}</h4>
                              <Badge variant={getReminderBadgeVariant(reservation.days_until)}>
                                {reservation.days_until} day{reservation.days_until !== 1 ? 's' : ''} away
                              </Badge>
                            </div>
                            <p className="text-base text-muted-foreground mt-1">
                              {(() => {
                                const parseLocalDate = (dateStr: string): Date => {
                                  const [year, month, day] = dateStr.split('-').map(Number);
                                  return new Date(year, month - 1, day);
                                };
                                const startDate = parseLocalDate(reservation.start_date);
                                const endDate = parseLocalDate(reservation.end_date);
                                return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
                              })()}
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
        </TabsContent>

        <TabsContent value="selections">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Selection Periods</CardTitle>
              <CardDescription className="text-base">
                Scheduled time periods when family groups can make reservations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingSelectionPeriods.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-base">No upcoming selection periods in the next 30 days</p>
                  </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSelectionPeriods.map((period) => {
                    const daysUntil = period.isCurrentlyActive ? 0 : period.daysUntilScheduled;
                    const periodId = `selection-${period.familyGroup}`;

                    return (
                      <Card key={periodId} className="border-l-4 border-l-secondary">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <h4 className="font-medium">{period.familyGroup} Selection Period</h4>
                                <Badge variant={period.isCurrentlyActive ? 'default' : getReminderBadgeVariant(daysUntil)}>
                                  {period.isCurrentlyActive ? 'Active Now' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{period.displayText}</p>
                              <p className="text-base text-muted-foreground">
                                {parseLocalDate(period.scheduledStartDate).toLocaleDateString()} - {parseLocalDate(period.scheduledEndDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Select
                                value={selectedReminderTypes[periodId] || ''}
                                onValueChange={(value) => handleReminderTypeChange(periodId, value)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select notification type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SELECTION_REMINDER_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => handleSendEventNotification({
                                  id: periodId,
                                  type: 'selection_period',
                                  title: `${period.familyGroup} Selection Period`,
                                  start_date: period.scheduledStartDate,
                                  end_date: period.scheduledEndDate,
                                  contact_email: '',
                                  contact_name: period.familyGroup,
                                  days_until: daysUntil,
                                  family_group: period.familyGroup
                                })}
                                disabled={sendingReminder === periodId || !selectedReminderTypes[periodId]}
                                size="sm"
                              >
                                {sendingReminder === periodId ? (
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
                     );
                  })}
                </div>
              )}
         </CardContent>
       </Card>
     </TabsContent>

        <TabsContent value="work-weekends">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Work Weekends</CardTitle>
              <CardDescription className="text-base">
                Scheduled work weekends that may need notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingWorkWeekends.length === 0 ? (
                <div className="text-center py-8">
                  <Hammer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-base">No upcoming work weekends in the next 30 days</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingWorkWeekends.map((workWeekend) => {
                    const startDate = parseLocalDate(workWeekend.start_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

                    return (
                      <Card key={workWeekend.id} className="border-l-4 border-l-accent">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Hammer className="h-4 w-4" />
                                <h4 className="font-medium">{workWeekend.title}</h4>
                                <Badge variant={getReminderBadgeVariant(daysUntil)}>
                                  {daysUntil} day{daysUntil !== 1 ? 's' : ''} away
                                </Badge>
                                <Badge variant="outline">{workWeekend.status}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">Proposed by {workWeekend.proposer_name}</p>
                              <p className="text-base text-muted-foreground">
                                {parseLocalDate(workWeekend.start_date).toLocaleDateString()} - {parseLocalDate(workWeekend.end_date).toLocaleDateString()}
                              </p>
                              {workWeekend.description && (
                                <p className="text-sm text-muted-foreground mt-1">{workWeekend.description}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Select
                                value={selectedReminderTypes[workWeekend.id] || ''}
                                onValueChange={(value) => handleReminderTypeChange(workWeekend.id, value)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select notification type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {WORK_WEEKEND_REMINDER_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => handleSendEventNotification({
                                  id: workWeekend.id,
                                  type: 'work_weekend',
                                  title: workWeekend.title,
                                  start_date: workWeekend.start_date,
                                  end_date: workWeekend.end_date,
                                  contact_email: workWeekend.proposer_email,
                                  contact_name: workWeekend.proposer_name,
                                  days_until: daysUntil,
                                  status: workWeekend.status,
                                  description: workWeekend.description,
                                  family_group: workWeekend.proposer_family_group
                                })}
                                disabled={sendingReminder === workWeekend.id || !selectedReminderTypes[workWeekend.id]}
                                size="sm"
                              >
                                {sendingReminder === workWeekend.id ? (
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};