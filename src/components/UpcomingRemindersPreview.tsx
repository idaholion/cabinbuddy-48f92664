import { useState, useEffect } from 'react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Calendar, Clock, Hammer, Users } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useReservations } from '@/hooks/useReservations';
import { useWorkWeekends } from '@/hooks/useWorkWeekends';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { supabase } from '@/integrations/supabase/client';
import { getHostFirstName } from '@/lib/reservation-utils';

interface ReminderPreview {
  id: string;
  type: 'reservation' | 'work_weekend' | 'selection_period';
  reminderType: '7_day' | '3_day' | '1_day' | 'selection_start' | 'selection_end';
  sendDate: Date;
  recipient: string;
  familyGroup: string;
  subject: string;
  content: string;
  eventDate: Date;
  eventTitle: string;
  enabled: boolean;
}

interface Props {
  automatedSettings: {
    automated_reminders_enabled: boolean;
    automated_selection_reminders_enabled: boolean;
    automated_work_weekend_reminders_enabled: boolean;
  };
}

export const UpcomingRemindersPreview = ({ automatedSettings }: Props) => {
  const { organization } = useOrganization();
  const { reservations } = useReservations();
  const { workWeekends } = useWorkWeekends();
  const { familyGroups } = useFamilyGroups();
  const [reminderPreviews, setReminderPreviews] = useState<ReminderPreview[]>([]);
  const [reminderTemplates, setReminderTemplates] = useState<any[]>([]);
  const [reservationPeriods, setReservationPeriods] = useState<any[]>([]);
  const [expandedReminders, setExpandedReminders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      fetchData();
    }
  }, [organization?.id, reservations, workWeekends]);

  const fetchData = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Fetch reminder templates
      const { data: templates } = await supabase
        .from('reminder_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      // Fetch reservation periods for selection reminders
      const { data: periods } = await supabase
        .from('reservation_periods')
        .select('*')
        .eq('organization_id', organization.id);

      setReminderTemplates(templates || []);
      setReservationPeriods(periods || []);
      
      generateReminderPreviews(templates || [], periods || []);
    } catch (error) {
      console.error('Error fetching reminder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReminderPreviews = (templates: any[], periods: any[]) => {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);
    const previews: ReminderPreview[] = [];

    // Generate reservation reminders
    if (automatedSettings.automated_reminders_enabled) {
      const reservationTemplate = templates.find(t => t.reminder_type === 'check_in');
      
      reservations.forEach(reservation => {
        const checkInDate = new Date(reservation.start_date);
        if (isAfter(checkInDate, now) && isBefore(checkInDate, thirtyDaysFromNow)) {
          const hostName = getHostFirstName(reservation);
          
          // 7-day reminder
          const sevenDayReminder = addDays(checkInDate, -7);
          if (isAfter(sevenDayReminder, now)) {
            previews.push({
              id: `res-7-${reservation.id}`,
              type: 'reservation',
              reminderType: '7_day',
              sendDate: sevenDayReminder,
              recipient: hostName,
              familyGroup: reservation.family_group,
              subject: generateSubject(reservationTemplate, '7-day', reservation),
              content: generateContent(reservationTemplate, '7-day', reservation),
              eventDate: checkInDate,
              eventTitle: `${reservation.family_group} Check-in`,
              enabled: true
            });
          }

          // 3-day reminder
          const threeDayReminder = addDays(checkInDate, -3);
          if (isAfter(threeDayReminder, now)) {
            previews.push({
              id: `res-3-${reservation.id}`,
              type: 'reservation',
              reminderType: '3_day',
              sendDate: threeDayReminder,
              recipient: hostName,
              familyGroup: reservation.family_group,
              subject: generateSubject(reservationTemplate, '3-day', reservation),
              content: generateContent(reservationTemplate, '3-day', reservation),
              eventDate: checkInDate,
              eventTitle: `${reservation.family_group} Check-in`,
              enabled: true
            });
          }

          // 1-day reminder
          const oneDayReminder = addDays(checkInDate, -1);
          if (isAfter(oneDayReminder, now)) {
            previews.push({
              id: `res-1-${reservation.id}`,
              type: 'reservation',
              reminderType: '1_day',
              sendDate: oneDayReminder,
              recipient: hostName,
              familyGroup: reservation.family_group,
              subject: generateSubject(reservationTemplate, '1-day', reservation),
              content: generateContent(reservationTemplate, '1-day', reservation),
              eventDate: checkInDate,
              eventTitle: `${reservation.family_group} Check-in`,
              enabled: true
            });
          }
        }
      });
    }

    // Generate work weekend reminders
    if (automatedSettings.automated_work_weekend_reminders_enabled) {
      workWeekends.forEach(workWeekend => {
        const workDate = new Date(workWeekend.start_date);
        if (isAfter(workDate, now) && isBefore(workDate, thirtyDaysFromNow) && workWeekend.status === 'fully_approved') {
          
          // 7-day reminder
          const sevenDayReminder = addDays(workDate, -7);
          if (isAfter(sevenDayReminder, now)) {
            previews.push({
              id: `work-7-${workWeekend.id}`,
              type: 'work_weekend',
              reminderType: '7_day',
              sendDate: sevenDayReminder,
              recipient: 'All Family Groups',
              familyGroup: 'All',
              subject: `Work Weekend Reminder - ${workWeekend.title}`,
              content: generateWorkWeekendContent('7-day', workWeekend),
              eventDate: workDate,
              eventTitle: workWeekend.title,
              enabled: true
            });
          }

          // 3-day reminder
          const threeDayReminder = addDays(workDate, -3);
          if (isAfter(threeDayReminder, now)) {
            previews.push({
              id: `work-3-${workWeekend.id}`,
              type: 'work_weekend',
              reminderType: '3_day',
              sendDate: threeDayReminder,
              recipient: 'All Family Groups',
              familyGroup: 'All',
              subject: `Work Weekend Reminder - ${workWeekend.title}`,
              content: generateWorkWeekendContent('3-day', workWeekend),
              eventDate: workDate,
              eventTitle: workWeekend.title,
              enabled: true
            });
          }

          // 1-day reminder
          const oneDayReminder = addDays(workDate, -1);
          if (isAfter(oneDayReminder, now)) {
            previews.push({
              id: `work-1-${workWeekend.id}`,
              type: 'work_weekend',
              reminderType: '1_day',
              sendDate: oneDayReminder,
              recipient: 'All Family Groups',
              familyGroup: 'All',
              subject: `Work Weekend Tomorrow - ${workWeekend.title}`,
              content: generateWorkWeekendContent('1-day', workWeekend),
              eventDate: workDate,
              eventTitle: workWeekend.title,
              enabled: true
            });
          }
        }
      });
    }

    // Generate selection period reminders
    if (automatedSettings.automated_selection_reminders_enabled) {
      periods.forEach(period => {
        // Parse dates correctly to avoid timezone issues
        const startDate = new Date(period.selection_start_date + 'T00:00:00');
        const endDate = new Date(period.selection_end_date + 'T00:00:00');

        // Find the specific family group that has this selection period
        const currentGroup = familyGroups.find(group => group.name === period.current_family_group);
        
        if (currentGroup && currentGroup.lead_name && currentGroup.lead_email) {
          // Start reminder (3 days before)
          const startReminder = addDays(startDate, -3);
          if (isAfter(startReminder, now) && isBefore(startReminder, thirtyDaysFromNow)) {
            previews.push({
              id: `sel-start-${period.id}`,
              type: 'selection_period',
              reminderType: 'selection_start',
              sendDate: startReminder,
              recipient: `${currentGroup.lead_name} (${currentGroup.lead_email})`,
              familyGroup: currentGroup.name,
              subject: generateSelectionSubject('start', period),
              content: generateSelectionContent('start', period),
              eventDate: startDate,
              eventTitle: `${period.current_family_group} Selection Period`,
              enabled: true
            });
          }

          // End reminder (same day)
          if (isAfter(endDate, now) && isBefore(endDate, thirtyDaysFromNow)) {
            previews.push({
              id: `sel-end-${period.id}`,
              type: 'selection_period',
              reminderType: 'selection_end',
              sendDate: endDate,
              recipient: `${currentGroup.lead_name} (${currentGroup.lead_email})`,
              familyGroup: currentGroup.name,
              subject: generateSelectionSubject('end', period),
              content: generateSelectionContent('end', period),
              eventDate: endDate,
              eventTitle: `${period.current_family_group} Selection Period`,
              enabled: true
            });
          }
        }
      });
    }

    // Sort by send date
    previews.sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime());
    setReminderPreviews(previews);
  };

  const generateSubject = (template: any, timing: string, reservation: any) => {
    if (!template?.subject_template) {
      return `${timing.replace('_', '-')} Cabin Reminder - ${reservation.family_group}`;
    }
    
    return template.subject_template
      .replace(/\{timing\}/g, timing.replace('_', '-'))
      .replace(/\{family_group\}/g, reservation.family_group)
      .replace(/\{host_name\}/g, getHostFirstName(reservation));
  };

  const generateContent = (template: any, timing: string, reservation: any) => {
    const defaultContent = `Hi ${getHostFirstName(reservation)},

This is a ${timing.replace('_', '-')} reminder that your family has a cabin reservation starting ${format(new Date(reservation.start_date), 'EEEE, MMMM do, yyyy')}.

Please review the check-in procedures and make sure everything is ready for your arrival.

Best regards,
The Cabin Management Team`;

    if (!template?.custom_message) {
      return defaultContent;
    }

    return template.custom_message
      .replace(/\{host_name\}/g, getHostFirstName(reservation))
      .replace(/\{family_group\}/g, reservation.family_group)
      .replace(/\{timing\}/g, timing.replace('_', '-'))
      .replace(/\{check_in_date\}/g, format(new Date(reservation.start_date), 'EEEE, MMMM do, yyyy'));
  };

  const generateWorkWeekendContent = (timing: string, workWeekend: any) => {
    return `Hello!

This is a ${timing.replace('_', '-')} reminder about the upcoming work weekend: ${workWeekend.title}

Date: ${format(new Date(workWeekend.start_date), 'EEEE, MMMM do')} - ${format(new Date(workWeekend.end_date), 'EEEE, MMMM do, yyyy')}
Organizer: ${workWeekend.proposer_name}

${workWeekend.description || 'Please plan to participate in this important cabin maintenance event.'}

Thank you for your participation!`;
  };

  // Helper function to substitute template variables
  const substituteTemplateVariables = (template: string, variables: Record<string, any>) => {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
    });
    return result;
  };

  // Helper function to generate selection reminder content using templates
  const generateSelectionContent = (type: 'start' | 'end', period: any) => {
    const templateType = type === 'start' ? 'selection_period_start' : 'selection_deadline';
    const template = reminderTemplates.find(t => t.reminder_type === templateType);
    
    // Parse dates correctly to avoid timezone issues
    const startDate = new Date(period.selection_start_date + 'T00:00:00');
    const endDate = new Date(period.selection_end_date + 'T00:00:00');
    
    if (!template) {
      // Fallback to hardcoded content if template not found
      if (type === 'start') {
        return `Hello Family Groups!

The ${period.current_family_group} selection period will begin in 3 days on ${format(startDate, 'EEEE, MMMM do, yyyy')}.

Period: ${format(startDate, 'MMM do')} - ${format(endDate, 'MMM do, yyyy')}

Please be ready to make your selections when the period opens.

Good luck!`;
      } else {
        return `Hello Family Groups!

This is the FINAL DAY for the ${period.current_family_group} selection period.

The selection period ends today: ${format(endDate, 'EEEE, MMMM do, yyyy')}

Don't miss out on making your reservations!`;
      }
    }

    // Find the current family group for this period
    const currentGroup = familyGroups.find(group => group.name === period.current_family_group);

    // Prepare variables for template substitution
    const variables = {
      family_group_name: period.current_family_group,
      guest_name: currentGroup?.lead_name || 'Family Lead',
      selection_year: startDate.getFullYear().toString(),
      selection_start_date: format(startDate, 'MMMM d, yyyy'),
      selection_end_date: format(endDate, 'MMMM d, yyyy'),
      organization_name: organization?.name || 'Your Organization',
      current_family_group: period.current_family_group
    };

    return substituteTemplateVariables(template.custom_message || template.subject_template, variables);
  };

  // Helper function to generate selection subject using templates
  const generateSelectionSubject = (type: 'start' | 'end', period: any) => {
    const templateType = type === 'start' ? 'selection_period_start' : 'selection_deadline';
    const template = reminderTemplates.find(t => t.reminder_type === templateType);
    
    if (!template) {
      // Fallback to hardcoded subject if template not found
      return type === 'start' 
        ? `Selection Period Opening Soon - ${period.current_family_group} Selection`
        : `Last Day: Selection Period Ending - ${period.current_family_group} Selection`;
    }

    // Parse dates correctly to avoid timezone issues
    const startDate = new Date(period.selection_start_date + 'T00:00:00');
    const endDate = new Date(period.selection_end_date + 'T00:00:00');

    // Find the current family group for this period
    const currentGroup = familyGroups.find(group => group.name === period.current_family_group);

    // Prepare variables for template substitution
    const variables = {
      family_group_name: period.current_family_group,
      guest_name: currentGroup?.lead_name || 'Family Lead',
      selection_year: startDate.getFullYear().toString(),
      selection_start_date: format(startDate, 'MMMM d, yyyy'),
      selection_end_date: format(endDate, 'MMMM d, yyyy'),
      organization_name: organization?.name || 'Your Organization',
      current_family_group: period.current_family_group
    };

    return substituteTemplateVariables(template.subject_template, variables);
  };

  const toggleExpanded = (reminderId: string) => {
    setExpandedReminders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reminderId)) {
        newSet.delete(reminderId);
      } else {
        newSet.add(reminderId);
      }
      return newSet;
    });
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'reservation':
        return <Calendar className="h-4 w-4" />;
      case 'work_weekend':
        return <Hammer className="h-4 w-4" />;
      case 'selection_period':
        return <Users className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getReminderColor = (type: string) => {
    switch (type) {
      case 'reservation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'work_weekend':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'selection_period':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const enabledReminders = reminderPreviews.filter(r => r.enabled);
  const totalReminders = enabledReminders.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Upcoming Automated Reminders
          <Badge variant="outline">{totalReminders} scheduled</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalReminders === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No automated reminders scheduled for the next 30 days</p>
            <p className="text-sm">Reminders will appear here when you have upcoming reservations or events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enabledReminders.map((reminder) => (
              <Collapsible key={reminder.id}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto"
                    onClick={() => toggleExpanded(reminder.id)}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className={`p-2 rounded-full ${getReminderColor(reminder.type)}`}>
                        {getReminderIcon(reminder.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{format(reminder.sendDate, 'MMM do, h:mm a')}</span>
                          <Badge variant="outline" className="text-xs">
                            {reminder.reminderType.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{reminder.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          To: {reminder.recipient} • Event: {format(reminder.eventDate, 'MMM do')}
                        </p>
                      </div>
                    </div>
                    {expandedReminders.has(reminder.id) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="border-l-2 border-muted pl-4 ml-6">
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-sm">Email Subject:</h4>
                        <p className="text-sm bg-muted p-2 rounded">{reminder.subject}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Message Content:</h4>
                        <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                          {reminder.content}
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Event: {reminder.eventTitle}</span>
                        <span>Date: {format(reminder.eventDate, 'EEEE, MMMM do, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};