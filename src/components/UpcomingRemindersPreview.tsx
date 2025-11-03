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
import { useSequentialSelection } from '@/hooks/useSequentialSelection';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useReservationPeriods } from '@/hooks/useReservationPeriods';
import { supabase } from '@/integrations/supabase/client';
import { getHostFirstName, getFirstNameFromFullName } from '@/lib/reservation-utils';
import { parseDateOnly } from '@/lib/date-utils';
import { getSelectionPeriodDisplayInfo } from '@/lib/selection-period-utils';

interface ReminderPreview {
  id: string;
  type: 'reservation' | 'work_weekend' | 'selection_period';
  reminderType: '7_day' | '3_day' | '1_day' | 'selection_start' | 'selection_end' | 'selection_end_secondary';
  sendDate: Date;
  recipient: string;
  familyGroup: string;
  subject: string;
  content: string;
  eventDate: Date;
  eventTitle: string;
  enabled: boolean;
  isSecondarySelection?: boolean;
}

interface Props {
  automatedSettings: {
    automated_reminders_enabled: boolean;
    automated_work_weekend_reminders_enabled: boolean;
    automated_selection_turn_notifications_enabled: boolean;
    automated_selection_ending_tomorrow_enabled: boolean;
    automated_reminders_7_day_enabled: boolean;
    automated_reminders_3_day_enabled: boolean;
    automated_reminders_1_day_enabled: boolean;
    automated_work_weekend_7_day_enabled: boolean;
    automated_work_weekend_3_day_enabled: boolean;
    automated_work_weekend_1_day_enabled: boolean;
  };
}

export const UpcomingRemindersPreview = ({ automatedSettings }: Props) => {
  const { organization } = useOrganization();
  const { reservations } = useReservations();
  const { workWeekends } = useWorkWeekends();
  const { familyGroups } = useFamilyGroups();
  const { getSelectionRotationYear } = useRotationOrder();
  const rotationYear = getSelectionRotationYear();
  const { currentFamilyGroup, getDaysRemaining } = useSequentialSelection(rotationYear);
  const { periods } = useReservationPeriods();
  const [reminderPreviews, setReminderPreviews] = useState<ReminderPreview[]>([]);
  const [reminderTemplates, setReminderTemplates] = useState<any[]>([]);
  const [selectionDays, setSelectionDays] = useState<number>(14);
  const [expandedReminders, setExpandedReminders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [completedFamilies, setCompletedFamilies] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (organization?.id && currentFamilyGroup !== null) {
      // Always fetch data to ensure we clear stale reminders when periods become empty
      fetchData();
    } else {
      // Clear reminders if we don't have required data
      setReminderPreviews([]);
      setLoading(false);
    }
  }, [organization?.id, reservations, workWeekends, currentFamilyGroup, periods]);

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

      setReminderTemplates(templates || []);
      
      // Fetch families that have clicked "I'm Done" for this rotation year
      const { data: timePeriodUsage } = await supabase
        .from('time_period_usage')
        .select('family_group, turn_completed')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .eq('turn_completed', true);

      // Create a set of family groups that have completed their turn
      const completedSet = new Set(
        (timePeriodUsage || []).map(usage => usage.family_group)
      );
      setCompletedFamilies(completedSet);
      
      // Fetch active secondary selection status
      const { data: secondaryStatus } = await supabase
        .from('secondary_selection_status')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .eq('turn_completed', false)
        .maybeSingle();
      
      // Use default selection days of 14 (can be made configurable later)
      const days = 14;
      setSelectionDays(days);
      
      // Filter periods by rotation year to match NotificationManagement logic
      const filteredPeriods = periods.filter(p => p.rotation_year === rotationYear);
      
      generateReminderPreviews(templates || [], filteredPeriods, days, completedSet, secondaryStatus);
    } catch (error) {
      console.error('Error fetching reminder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReminderPreviews = (templates: any[], periods: any[], days: number = 14, completedFamiliesSet: Set<string> = new Set(), secondaryStatus: any = null) => {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);
    const previews: ReminderPreview[] = [];

    console.log('[UpcomingRemindersPreview] Generating previews with:', {
      templatesCount: templates.length,
      periodsCount: periods.length,
      currentFamilyGroup,
      automatedSettings,
      days,
      completedFamiliesCount: completedFamiliesSet.size
    });

    // Generate reservation reminders
    if (automatedSettings.automated_reminders_enabled) {
      reservations.forEach(reservation => {
        const checkInDate = parseDateOnly(reservation.start_date);
        const checkOutDate = parseDateOnly(reservation.end_date);
        if (isAfter(checkInDate, now) && isBefore(checkInDate, thirtyDaysFromNow)) {
          const hostName = getHostFirstName(reservation);
          
          // Common variables for all reservation reminders
          const variables = {
            guest_name: hostName,
            family_group_name: reservation.family_group,
            check_in_date: format(checkInDate, 'EEEE, MMMM do, yyyy'),
            check_out_date: format(checkOutDate, 'EEEE, MMMM do, yyyy'),
            organization_name: organization?.name || 'Your Organization'
          };
          
          // 7-day reminder
          const sevenDayTemplate = templates.find(t => t.reminder_type === 'seven_day');
          const sevenDayReminder = addDays(checkInDate, -7);
          if (isAfter(sevenDayReminder, now) && automatedSettings.automated_reminders_7_day_enabled) {
            previews.push({
              id: `res-7-${reservation.id}`,
              type: 'reservation',
              reminderType: '7_day',
              sendDate: sevenDayReminder,
              recipient: hostName,
              familyGroup: reservation.family_group,
              subject: generateReservationSubject(sevenDayTemplate, '7-day', variables),
              content: generateReservationContent(sevenDayTemplate, '7-day', variables),
              eventDate: checkInDate,
              eventTitle: `${reservation.family_group} Check-in`,
              enabled: true
            });
          }

          // 3-day reminder
          const threeDayTemplate = templates.find(t => t.reminder_type === 'three_day');
          const threeDayReminder = addDays(checkInDate, -3);
          if (isAfter(threeDayReminder, now) && automatedSettings.automated_reminders_3_day_enabled) {
            previews.push({
              id: `res-3-${reservation.id}`,
              type: 'reservation',
              reminderType: '3_day',
              sendDate: threeDayReminder,
              recipient: hostName,
              familyGroup: reservation.family_group,
              subject: generateReservationSubject(threeDayTemplate, '3-day', variables),
              content: generateReservationContent(threeDayTemplate, '3-day', variables),
              eventDate: checkInDate,
              eventTitle: `${reservation.family_group} Check-in`,
              enabled: true
            });
          }

          // 1-day reminder
          const oneDayTemplate = templates.find(t => t.reminder_type === 'one_day');
          const oneDayReminder = addDays(checkInDate, -1);
          if (isAfter(oneDayReminder, now) && automatedSettings.automated_reminders_1_day_enabled) {
            previews.push({
              id: `res-1-${reservation.id}`,
              type: 'reservation',
              reminderType: '1_day',
              sendDate: oneDayReminder,
              recipient: hostName,
              familyGroup: reservation.family_group,
              subject: generateReservationSubject(oneDayTemplate, '1-day', variables),
              content: generateReservationContent(oneDayTemplate, '1-day', variables),
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
      const workWeekendTemplate = templates.find(t => t.reminder_type === 'work_weekend_reminder');
      
      workWeekends.forEach(workWeekend => {
        const workDate = parseDateOnly(workWeekend.start_date);
        const endDate = parseDateOnly(workWeekend.end_date);
        if (isAfter(workDate, now) && isBefore(workDate, thirtyDaysFromNow) && workWeekend.status === 'fully_approved') {
          
          // Common variables for all work weekend reminders
          const variables = {
            participant_name: 'Family Groups',
            work_weekend_date: format(workDate, 'EEEE, MMMM do, yyyy'),
            start_time: format(workDate, 'h:mm a'),
            location: 'Cabin Property',
            coordinator_name: workWeekend.proposer_name || 'Work Weekend Coordinator',
            work_weekend_title: workWeekend.title,
            work_weekend_description: workWeekend.description || '',
            organization_name: organization?.name || 'Your Organization'
          };
          
          // 7-day reminder
          const sevenDayReminder = addDays(workDate, -7);
          if (isAfter(sevenDayReminder, now) && automatedSettings.automated_work_weekend_7_day_enabled) {
            previews.push({
              id: `work-7-${workWeekend.id}`,
              type: 'work_weekend',
              reminderType: '7_day',
              sendDate: sevenDayReminder,
              recipient: 'All Family Groups',
              familyGroup: 'All',
              subject: generateWorkWeekendSubject(workWeekendTemplate, '7-day', variables),
              content: generateWorkWeekendContent(workWeekendTemplate, '7-day', variables),
              eventDate: workDate,
              eventTitle: workWeekend.title,
              enabled: true
            });
          }

          // 3-day reminder
          const threeDayReminder = addDays(workDate, -3);
          if (isAfter(threeDayReminder, now) && automatedSettings.automated_work_weekend_3_day_enabled) {
            previews.push({
              id: `work-3-${workWeekend.id}`,
              type: 'work_weekend',
              reminderType: '3_day',
              sendDate: threeDayReminder,
              recipient: 'All Family Groups',
              familyGroup: 'All',
              subject: generateWorkWeekendSubject(workWeekendTemplate, '3-day', variables),
              content: generateWorkWeekendContent(workWeekendTemplate, '3-day', variables),
              eventDate: workDate,
              eventTitle: workWeekend.title,
              enabled: true
            });
          }

          // 1-day reminder
          const oneDayReminder = addDays(workDate, -1);
          if (isAfter(oneDayReminder, now) && automatedSettings.automated_work_weekend_1_day_enabled) {
            previews.push({
              id: `work-1-${workWeekend.id}`,
              type: 'work_weekend',
              reminderType: '1_day',
              sendDate: oneDayReminder,
              recipient: 'All Family Groups',
              familyGroup: 'All',
              subject: generateWorkWeekendSubject(workWeekendTemplate, '1-day', variables),
              content: generateWorkWeekendContent(workWeekendTemplate, '1-day', variables),
              eventDate: workDate,
              eventTitle: workWeekend.title,
              enabled: true
            });
          }
        }
      });
    }

    // Generate SELECTION PERIOD reminders for SEQUENTIAL SELECTION MODE
    // Use the actual dates from reservation_periods table, not calculated dates
    if (automatedSettings.automated_selection_turn_notifications_enabled || automatedSettings.automated_selection_ending_tomorrow_enabled) {
      console.log('[UpcomingRemindersPreview] Generating selection period reminders using reservation_periods data');
      
      // Get all active and upcoming periods from the database
      // Filter out periods where families have clicked "I'm Done"
      const activePeriods = periods.filter(p => 
        p.rotation_year === rotationYear && 
        !p.reservations_completed &&
        !completedFamiliesSet.has(p.current_family_group)
      );
      
      console.log('[UpcomingRemindersPreview] Active periods found:', activePeriods.length);
      console.log('[UpcomingRemindersPreview] Completed families (filtered out):', Array.from(completedFamiliesSet));
      
      activePeriods.forEach(period => {
        const familyGroup = familyGroups.find(fg => fg.name === period.current_family_group);
        if (!familyGroup) {
          console.log('[UpcomingRemindersPreview] Family group not found:', period.current_family_group);
          return;
        }
        
        // Parse the actual stored dates from the database
        const actualStartDate = parseDateOnly(period.selection_start_date);
        const selectionEndDate = parseDateOnly(period.selection_end_date);
        
        console.log('[UpcomingRemindersPreview] Processing period for:', {
          familyGroup: period.current_family_group,
          startDate: period.selection_start_date,
          endDate: period.selection_end_date,
          isCurrentFamily: period.current_family_group === currentFamilyGroup
        });
        
        // Selection turn START notification (sent when period begins)
        // Only show if the start date is within the 30-day preview window
        if (automatedSettings.automated_selection_turn_notifications_enabled) {
          if (isAfter(actualStartDate, now) && isBefore(actualStartDate, thirtyDaysFromNow)) {
            console.log('[UpcomingRemindersPreview] Adding selection start notification for:', period.current_family_group);
            previews.push({
              id: `sel-start-${period.current_family_group}-${rotationYear}`,
              type: 'selection_period',
              reminderType: 'selection_start',
              sendDate: actualStartDate,
              recipient: period.current_family_group,
              familyGroup: period.current_family_group,
              subject: `Your Selection Period Has Started - ${rotationYear}`,
              content: `It's now your turn to make your cabin reservations for ${rotationYear}. You have ${days} days to complete your selections.`,
              eventDate: actualStartDate,
              eventTitle: `${period.current_family_group} Selection Period`,
              enabled: true
            });
          }
        }
        
        // Selection ENDING TOMORROW reminder
        if (automatedSettings.automated_selection_ending_tomorrow_enabled) {
          const dayBeforeEnd = addDays(selectionEndDate, -1);
          const isInFuture = isAfter(dayBeforeEnd, now) || format(dayBeforeEnd, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          
          console.log('[UpcomingRemindersPreview] Checking selection ending tomorrow:', {
            familyGroup: period.current_family_group,
            endDate: format(selectionEndDate, 'yyyy-MM-dd'),
            dayBeforeEnd: format(dayBeforeEnd, 'yyyy-MM-dd'),
            now: format(now, 'yyyy-MM-dd'),
            isInFuture,
            willShowReminder: isInFuture
          });
          
          // Show if the "day before end" is today or in the future and within 30-day window
          if (isInFuture && isBefore(dayBeforeEnd, thirtyDaysFromNow)) {
            console.log('[UpcomingRemindersPreview] Adding selection ending notification for:', period.current_family_group);
            previews.push({
              id: `sel-end-${period.current_family_group}-${rotationYear}`,
              type: 'selection_period',
              reminderType: 'selection_end',
              sendDate: dayBeforeEnd,
              recipient: period.current_family_group,
              familyGroup: period.current_family_group,
              subject: `Your Selection Period Ends Tomorrow - ${rotationYear}`,
              content: `Reminder: Your selection period ends tomorrow (${format(selectionEndDate, 'MMM d, yyyy')}). Please complete your cabin reservations soon.`,
              eventDate: selectionEndDate,
              eventTitle: `${period.current_family_group} Selection Deadline`,
              enabled: true
            });
          } else {
            console.log('[UpcomingRemindersPreview] Skipping selection ending notification - date outside window or passed');
          }
        }
      });
    }

    // Generate SECONDARY selection reminders (only for currently active family)
    if (secondaryStatus && secondaryStatus.current_family_group && 
        automatedSettings.automated_selection_ending_tomorrow_enabled) {
      
      console.log('[UpcomingRemindersPreview] Generating secondary selection reminders for:', secondaryStatus.current_family_group);
      
      const secondaryFamily = secondaryStatus.current_family_group;
      const secondaryDays = 7; // Secondary selection default
      
      // Calculate end date from started_at timestamp
      // Extract date portion from timestamp (YYYY-MM-DD) before parsing
      const startedAtDate = secondaryStatus.started_at.split('T')[0];
      const startDate = parseDateOnly(startedAtDate);
      const endDate = addDays(startDate, secondaryDays);
      const dayBeforeEnd = addDays(endDate, -1);
      
      const isInFuture = isAfter(dayBeforeEnd, now) || 
                         format(dayBeforeEnd, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      
      console.log('[UpcomingRemindersPreview] Secondary selection reminder check:', {
        family: secondaryFamily,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        dayBeforeEnd: format(dayBeforeEnd, 'yyyy-MM-dd'),
        isInFuture,
        withinWindow: isBefore(dayBeforeEnd, thirtyDaysFromNow)
      });
      
      if (isInFuture && isBefore(dayBeforeEnd, thirtyDaysFromNow)) {
        console.log('[UpcomingRemindersPreview] Adding secondary selection ending notification');
        previews.push({
          id: `sel-end-secondary-${secondaryFamily}-${rotationYear}`,
          type: 'selection_period',
          reminderType: 'selection_end_secondary',
          sendDate: dayBeforeEnd,
          recipient: secondaryFamily,
          familyGroup: secondaryFamily,
          subject: `Your Secondary Selection Period Ends Tomorrow - ${rotationYear}`,
          content: `Reminder: Your secondary selection period ends tomorrow (${format(endDate, 'MMM d, yyyy')}). You have ${secondaryDays} days total for secondary selections.\n\nThis is your opportunity to make additional cabin reservations from available time periods.`,
          eventDate: endDate,
          eventTitle: `${secondaryFamily} Secondary Selection Deadline`,
          enabled: true,
          isSecondarySelection: true
        });
      }
    }

    console.log('[UpcomingRemindersPreview] Final previews count:', previews.length);

    // Sort by send date
    previews.sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime());
    setReminderPreviews(previews);
  };

  // Helper function to generate reservation reminder subjects using templates
  const generateReservationSubject = (template: any, timing: string, variables: Record<string, any>) => {
    if (!template?.subject_template) {
      return `${timing} Cabin Reminder - ${variables.family_group_name}`;
    }
    
    return substituteTemplateVariables(template.subject_template, variables);
  };

  // Helper function to generate reservation reminder content using templates
  const generateReservationContent = (template: any, timing: string, variables: Record<string, any>) => {
    const defaultContent = `Hi ${variables.guest_name},

This is a ${timing} reminder that your family has a cabin reservation starting ${variables.check_in_date}.

Please review the check-in procedures and make sure everything is ready for your arrival.

Best regards,
The Cabin Management Team`;

    if (!template?.custom_message && !template?.checklist_items) {
      return defaultContent;
    }

    let content = '';
    
    // Add custom message if it exists
    if (template.custom_message) {
      content += substituteTemplateVariables(template.custom_message, variables);
    }
    
    // Add checklist items if they exist
    if (template.checklist_items && Array.isArray(template.checklist_items) && template.checklist_items.length > 0) {
      if (content) content += '\n\n';
      content += 'CHECKLIST ITEMS:\n';
      template.checklist_items.forEach((item: string) => {
        content += `• ${item}\n`;
      });
    }

    return content || defaultContent;
  };

  // Helper function to generate work weekend reminder subjects using templates
  const generateWorkWeekendSubject = (template: any, timing: string, variables: Record<string, any>) => {
    if (!template?.subject_template) {
      return `Work Weekend ${timing} Reminder - ${variables.work_weekend_title}`;
    }
    
    return substituteTemplateVariables(template.subject_template, variables);
  };

  // Helper function to generate work weekend reminder content using templates
  const generateWorkWeekendContent = (template: any, timing: string, variables: Record<string, any>) => {
    const defaultContent = `Hello!

This is a ${timing} reminder about the upcoming work weekend: ${variables.work_weekend_title}

Date: ${variables.work_weekend_date}
Organizer: ${variables.coordinator_name}

${variables.work_weekend_description || 'Please plan to participate in this important cabin maintenance event.'}

Thank you for your participation!`;

    if (!template?.custom_message) {
      return defaultContent;
    }

    return substituteTemplateVariables(template.custom_message, variables);
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

    // Calculate time remaining for deadline reminders
    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    let timeRemaining = '';
    if (daysRemaining > 1) {
      timeRemaining = `${daysRemaining} days`;
    } else if (daysRemaining === 1) {
      timeRemaining = '1 day';
    } else if (daysRemaining === 0) {
      const hoursRemaining = Math.ceil(timeDiff / (1000 * 3600));
      timeRemaining = hoursRemaining > 0 ? `${hoursRemaining} hours` : 'Less than 1 hour';
    } else {
      timeRemaining = 'Deadline has passed';
    }

    // Prepare variables for template substitution
    const variables = {
      family_group_name: period.current_family_group,
      guest_name: getFirstNameFromFullName(currentGroup?.lead_name || 'Family Lead'),
      selection_year: startDate.getFullYear().toString(),
      selection_start_date: format(startDate, 'MMMM d, yyyy'),
      selection_end_date: format(endDate, 'MMMM d, yyyy'),
      deadline_date: format(endDate, 'MMMM d, yyyy'),
      selection_status: 'In Progress',
      time_remaining: timeRemaining,
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

    // Calculate time remaining for deadline reminders
    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    let timeRemaining = '';
    if (daysRemaining > 1) {
      timeRemaining = `${daysRemaining} days`;
    } else if (daysRemaining === 1) {
      timeRemaining = '1 day';
    } else if (daysRemaining === 0) {
      const hoursRemaining = Math.ceil(timeDiff / (1000 * 3600));
      timeRemaining = hoursRemaining > 0 ? `${hoursRemaining} hours` : 'Less than 1 hour';
    } else {
      timeRemaining = 'Deadline has passed';
    }

    // Prepare variables for template substitution
    const variables = {
      family_group_name: period.current_family_group,
      guest_name: getFirstNameFromFullName(currentGroup?.lead_name || 'Family Lead'),
      selection_year: startDate.getFullYear().toString(),
      selection_start_date: format(startDate, 'MMMM d, yyyy'),
      selection_end_date: format(endDate, 'MMMM d, yyyy'),
      deadline_date: format(endDate, 'MMMM d, yyyy'),
      selection_status: 'In Progress',
      time_remaining: timeRemaining,
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
                          {reminder.isSecondarySelection && (
                            <Badge variant="secondary" className="text-xs">
                              Secondary Round
                            </Badge>
                          )}
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