import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Settings, AlertTriangle, Calendar, Hammer, Eye, EyeOff } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UpcomingRemindersPreview } from "@/components/UpcomingRemindersPreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ScheduledTemplate {
  id: string;
  reminder_type: string;
  is_active: boolean;
  days_in_advance: number | null;
  trigger_event: string;
  delivery_method: 'email' | 'sms' | 'both';
}

type DeliveryMethod = 'email' | 'sms' | 'both';

interface AutomatedSettings {

  automated_reminders_enabled: boolean;
  automated_selection_turn_notifications_enabled: boolean;
  automated_selection_ending_tomorrow_enabled: boolean;
  automated_work_weekend_reminders_enabled: boolean;
  delivery_selection_turn: DeliveryMethod;
  delivery_selection_ending: DeliveryMethod;
  delivery_work_weekend: DeliveryMethod;
  automated_reminders_7_day_enabled: boolean;
  automated_reminders_3_day_enabled: boolean;
  automated_reminders_1_day_enabled: boolean;
  automated_work_weekend_7_day_enabled: boolean;
  automated_work_weekend_3_day_enabled: boolean;
  automated_work_weekend_1_day_enabled: boolean;
  calendar_keeper_receives_notification_copies: boolean;
  ck_copy_reminder_7_day: boolean;
  ck_copy_reminder_3_day: boolean;
  ck_copy_reminder_1_day: boolean;
  ck_copy_selection_turn_start: boolean;
  ck_copy_selection_ending_tomorrow: boolean;
  ck_copy_work_weekend_reminder: boolean;
  ck_copy_work_weekend_proposed: boolean;
  ck_copy_work_weekend_invitation: boolean;
  ck_copy_confirmation: boolean;
  ck_copy_cancellation: boolean;
  ck_copy_manual_template: boolean;
}

export const AutomatedReminderSettings = () => {
  const { organization, loading: orgLoading } = useOrganization();
  const [settings, setSettings] = useState<AutomatedSettings>({
    automated_reminders_enabled: false,
    automated_selection_turn_notifications_enabled: false,
    automated_selection_ending_tomorrow_enabled: false,
    automated_work_weekend_reminders_enabled: false,
    delivery_selection_turn: 'email',
    delivery_selection_ending: 'email',
    delivery_work_weekend: 'email',
    automated_reminders_7_day_enabled: true,
    automated_reminders_3_day_enabled: true,
    automated_reminders_1_day_enabled: true,
    automated_work_weekend_7_day_enabled: true,
    automated_work_weekend_3_day_enabled: true,
    automated_work_weekend_1_day_enabled: true,
    calendar_keeper_receives_notification_copies: false,
    ck_copy_reminder_7_day: true,
    ck_copy_reminder_3_day: true,
    ck_copy_reminder_1_day: true,
    ck_copy_selection_turn_start: true,
    ck_copy_selection_ending_tomorrow: true,
    ck_copy_work_weekend_reminder: true,
    ck_copy_work_weekend_proposed: false,
    ck_copy_work_weekend_invitation: false,
    ck_copy_confirmation: false,
    ck_copy_cancellation: true,
    ck_copy_manual_template: false,
  });
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduledTemplates, setScheduledTemplates] = useState<ScheduledTemplate[]>([]);

  useEffect(() => {
    if (organization) {
      fetchAutomatedReminderStatus();
      fetchScheduledTemplates();
    }
  }, [organization]);

  const formatTemplateName = (type: string) =>
    (type || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const fetchScheduledTemplates = async () => {
    if (!organization) return;
    const { data, error } = await supabase
      .from('reminder_templates')
      .select('id, reminder_type, is_active, days_in_advance, trigger_event, delivery_method')
      .eq('organization_id', organization.id)
      .in('trigger_event', ['before_start', 'before_end'])
      .not('days_in_advance', 'is', null)
      .order('trigger_event', { ascending: true })
      .order('days_in_advance', { ascending: false });

    if (error) {
      console.error('Error fetching scheduled reminder templates:', error);
      return;
    }
    setScheduledTemplates(((data || []) as any[]).map((t) => ({
      ...t,
      delivery_method: (t.delivery_method || 'email') as ScheduledTemplate['delivery_method'],
    })));
  };

  const handleTemplateToggle = async (templateId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('reminder_templates')
      .update({ is_active: enabled })
      .eq('id', templateId);

    if (error) {
      console.error('Error updating reminder template:', error);
      toast.error('Failed to update reminder');
      return;
    }
    setScheduledTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, is_active: enabled } : t))
    );
    toast.success(enabled ? 'Reminder enabled' : 'Reminder disabled');
  };


  const handleDeliveryChange = async (templateId: string, method: ScheduledTemplate['delivery_method']) => {
    const { error } = await supabase
      .from('reminder_templates')
      .update({ delivery_method: method })
      .eq('id', templateId);

    if (error) {
      console.error('Error updating delivery method:', error);
      toast.error('Failed to update delivery method');
      return;
    }
    setScheduledTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, delivery_method: method } : t))
    );
    toast.success('Delivery method updated');
  };

  const fetchAutomatedReminderStatus = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          automated_reminders_enabled, 
          automated_selection_turn_notifications_enabled,
          automated_selection_ending_tomorrow_enabled,
          automated_work_weekend_reminders_enabled,
          automated_reminders_7_day_enabled,
          automated_reminders_3_day_enabled, 
          automated_reminders_1_day_enabled,
          automated_work_weekend_7_day_enabled,
          automated_work_weekend_3_day_enabled,
          automated_work_weekend_1_day_enabled,
          calendar_keeper_receives_notification_copies,
          ck_copy_reminder_7_day,
          ck_copy_reminder_3_day,
          ck_copy_reminder_1_day,
          ck_copy_selection_turn_start,
          ck_copy_selection_ending_tomorrow,
          ck_copy_work_weekend_reminder,
          ck_copy_work_weekend_proposed,
          ck_copy_work_weekend_invitation,
          ck_copy_confirmation,
          ck_copy_cancellation,
          ck_copy_manual_template,
          delivery_selection_turn,
          delivery_selection_ending,
          delivery_work_weekend
        `)
        .eq('id', organization.id)
        .single();

      if (error) {
        console.error('Error fetching automated reminder status:', error);
        toast.error('Failed to load automated reminder settings');
        return;
      }

      setSettings({
        automated_reminders_enabled: data?.automated_reminders_enabled || false,
        automated_selection_turn_notifications_enabled: data?.automated_selection_turn_notifications_enabled || false,
        automated_selection_ending_tomorrow_enabled: data?.automated_selection_ending_tomorrow_enabled || false,
        automated_work_weekend_reminders_enabled: data?.automated_work_weekend_reminders_enabled || false,
        delivery_selection_turn: ((data as any)?.delivery_selection_turn || 'email') as DeliveryMethod,
        delivery_selection_ending: ((data as any)?.delivery_selection_ending || 'email') as DeliveryMethod,
        delivery_work_weekend: ((data as any)?.delivery_work_weekend || 'email') as DeliveryMethod,
        automated_reminders_7_day_enabled: data?.automated_reminders_7_day_enabled ?? true,
        automated_reminders_3_day_enabled: data?.automated_reminders_3_day_enabled ?? true,
        automated_reminders_1_day_enabled: data?.automated_reminders_1_day_enabled ?? true,
        automated_work_weekend_7_day_enabled: data?.automated_work_weekend_7_day_enabled ?? true,
        automated_work_weekend_3_day_enabled: data?.automated_work_weekend_3_day_enabled ?? true,
        automated_work_weekend_1_day_enabled: data?.automated_work_weekend_1_day_enabled ?? true,
        calendar_keeper_receives_notification_copies: data?.calendar_keeper_receives_notification_copies || false,
        ck_copy_reminder_7_day: data?.ck_copy_reminder_7_day ?? true,
        ck_copy_reminder_3_day: data?.ck_copy_reminder_3_day ?? true,
        ck_copy_reminder_1_day: data?.ck_copy_reminder_1_day ?? true,
        ck_copy_selection_turn_start: data?.ck_copy_selection_turn_start ?? true,
        ck_copy_selection_ending_tomorrow: data?.ck_copy_selection_ending_tomorrow ?? true,
        ck_copy_work_weekend_reminder: data?.ck_copy_work_weekend_reminder ?? true,
        ck_copy_work_weekend_proposed: data?.ck_copy_work_weekend_proposed ?? false,
        ck_copy_work_weekend_invitation: data?.ck_copy_work_weekend_invitation ?? false,
        ck_copy_confirmation: data?.ck_copy_confirmation ?? false,
        ck_copy_cancellation: data?.ck_copy_cancellation ?? true,
        ck_copy_manual_template: data?.ck_copy_manual_template ?? false,
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load automated reminder settings');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgDeliveryChange = async (
    field: 'delivery_selection_turn' | 'delivery_selection_ending' | 'delivery_work_weekend',
    method: DeliveryMethod
  ) => {
    if (!organization) return;
    const { error } = await supabase
      .from('organizations')
      .update({ [field]: method } as any)
      .eq('id', organization.id);

    if (error) {
      console.error('Error updating delivery method:', error);
      toast.error('Failed to update delivery method');
      return;
    }
    setSettings((prev) => ({ ...prev, [field]: method }));
    toast.success('Delivery method updated');
  };

  const DeliverySelect = ({
    field,
    disabled,
  }: {
    field: 'delivery_selection_turn' | 'delivery_selection_ending' | 'delivery_work_weekend';
    disabled?: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Send by</span>
      <Select
        value={settings[field]}
        onValueChange={(value) => handleOrgDeliveryChange(field, value as DeliveryMethod)}
        disabled={disabled}
      >
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="email">Email only</SelectItem>
          <SelectItem value="sms">Text only</SelectItem>
          <SelectItem value="both">Email + Text</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const handleToggle = async (field: keyof AutomatedSettings, enabled: boolean) => {
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ [field]: enabled })
        .eq('id', organization.id);

      if (error) {
        console.error('Error updating automated reminder setting:', error);
        toast.error('Failed to update automated reminder settings');
        return;
      }

      setSettings(prev => ({ ...prev, [field]: enabled }));
      
      const settingNames = {
        automated_reminders_enabled: 'reservation reminders',
        automated_selection_turn_notifications_enabled: 'selection turn notifications',
        automated_selection_ending_tomorrow_enabled: 'selection ending tomorrow reminders',
        automated_work_weekend_reminders_enabled: 'work weekend reminders',
        automated_reminders_7_day_enabled: 'reservation 7-day reminders',
        automated_reminders_3_day_enabled: 'reservation 3-day reminders',
        automated_reminders_1_day_enabled: 'reservation 1-day reminders',
        automated_work_weekend_7_day_enabled: 'work weekend 7-day reminders',
        automated_work_weekend_3_day_enabled: 'work weekend 3-day reminders',
        automated_work_weekend_1_day_enabled: 'work weekend 1-day reminders',
      };
      
      toast.success(
        enabled 
          ? `Automated ${settingNames[field]} enabled successfully` 
          : `Automated ${settingNames[field]} disabled successfully`
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update automated reminder settings');
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const anyEnabled = settings.automated_reminders_enabled || 
                    settings.automated_selection_turn_notifications_enabled ||
                    settings.automated_selection_ending_tomorrow_enabled ||
                    settings.automated_work_weekend_reminders_enabled ||
                    settings.automated_reminders_7_day_enabled ||
                    settings.automated_reminders_3_day_enabled ||
                    settings.automated_reminders_1_day_enabled ||
                    settings.automated_work_weekend_7_day_enabled ||
                    settings.automated_work_weekend_3_day_enabled ||
                    settings.automated_work_weekend_1_day_enabled;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Automated Reminder System</CardTitle>
            <Badge variant={anyEnabled ? "default" : "secondary"}>
              {anyEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription>
            Control which automated notifications the system sends based on your reminder templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Reservation Reminders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <Label htmlFor="reservation-reminders" className="text-sm font-medium">
                    Reservation Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send automated email reminders about upcoming cabin reservations
                  </p>
                </div>
              </div>
              <Switch
                id="reservation-reminders"
                checked={settings.automated_reminders_enabled}
                onCheckedChange={(enabled) => handleToggle('automated_reminders_enabled', enabled)}
              />
            </div>
            
            {settings.automated_reminders_enabled && (
              <div className="ml-6 mt-3 space-y-3 border-l-2 border-muted pl-4">
                {scheduledTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No scheduled reminder templates yet. Create one in Reminder Templates and it will appear here.
                  </p>
                ) : (
                  scheduledTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`tpl-${tpl.id}`}
                          checked={tpl.is_active}
                          onCheckedChange={(enabled) => handleTemplateToggle(tpl.id, enabled)}
                        />
                        <Label htmlFor={`tpl-${tpl.id}`} className="text-sm">
                          {formatTemplateName(tpl.reminder_type)}
                          <span className="text-muted-foreground font-normal">
                            {" "}— sends {tpl.days_in_advance} day{tpl.days_in_advance === 1 ? '' : 's'} before stay {tpl.trigger_event === 'before_end' ? 'ends' : 'starts'}
                          </span>
                        </Label>
                      </div>
                      <Select
                        value={tpl.delivery_method}
                        onValueChange={(value) => handleDeliveryChange(tpl.id, value as ScheduledTemplate['delivery_method'])}
                        disabled={!tpl.is_active}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email only</SelectItem>
                          <SelectItem value="sms">Text only</SelectItem>
                          <SelectItem value="both">Email + Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            )}

            
            <div className="border-l-4 border-muted pl-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                • Sends reminders based on your configured templates
              </p>
              <p className="text-xs text-muted-foreground">
                • Respects family group preferences and contact methods
              </p>
            </div>
          </div>

          {/* Selection Turn Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <Label htmlFor="selection-turn-notifications" className="text-sm font-medium">
                    Selection Turn Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify families when it's their turn to select reservations
                  </p>
                </div>
              </div>
              <Switch
                id="selection-turn-notifications"
                checked={settings.automated_selection_turn_notifications_enabled}
                onCheckedChange={(enabled) => handleToggle('automated_selection_turn_notifications_enabled', enabled)}
              />
            </div>
            
            <div className="border-l-4 border-green-200 pl-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                • Sends "It's your turn NOW" when selection begins or previous family finishes
              </p>
              <p className="text-xs text-muted-foreground">
                • Works automatically even if previous family doesn't click "I'm Done"
              </p>
            </div>
          </div>

          {/* Selection Ending Tomorrow */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <Label htmlFor="selection-ending-tomorrow" className="text-sm font-medium">
                    Selection Ending Tomorrow Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Remind families one day before their selection time expires
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DeliverySelect field="delivery_selection_ending" disabled={!settings.automated_selection_ending_tomorrow_enabled} />
                <Switch
                  id="selection-ending-tomorrow"
                  checked={settings.automated_selection_ending_tomorrow_enabled}
                  onCheckedChange={(enabled) => handleToggle('automated_selection_ending_tomorrow_enabled', enabled)}
                />
              </div>
            </div>
            
            <div className="border-l-4 border-blue-200 pl-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                • Sends reminder at 9am the day before selection time ends
              </p>
              <p className="text-xs text-muted-foreground">
                • Helps families avoid losing their turn
              </p>
            </div>
          </div>

          {/* Work Weekend Reminders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Hammer className="h-4 w-4 text-orange-600" />
                <div>
                  <Label htmlFor="work-weekend-reminders" className="text-sm font-medium">
                    Work Weekend Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send reminders about scheduled work weekends
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DeliverySelect field="delivery_work_weekend" disabled={!settings.automated_work_weekend_reminders_enabled} />
                <Switch
                  id="work-weekend-reminders"
                  checked={settings.automated_work_weekend_reminders_enabled}
                  onCheckedChange={(enabled) => handleToggle('automated_work_weekend_reminders_enabled', enabled)}
                />
              </div>
            </div>
            
            {settings.automated_work_weekend_reminders_enabled && (
              <div className="ml-6 mt-3 space-y-3 border-l-2 border-muted pl-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="work-weekend-7-day"
                    checked={settings.automated_work_weekend_7_day_enabled}
                    onCheckedChange={(enabled) => handleToggle('automated_work_weekend_7_day_enabled', enabled)}
                  />
                  <Label htmlFor="work-weekend-7-day" className="text-sm">7-day reminders</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="work-weekend-3-day"
                    checked={settings.automated_work_weekend_3_day_enabled}
                    onCheckedChange={(enabled) => handleToggle('automated_work_weekend_3_day_enabled', enabled)}
                  />
                  <Label htmlFor="work-weekend-3-day" className="text-sm">3-day reminders</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="work-weekend-1-day"
                    checked={settings.automated_work_weekend_1_day_enabled}
                    onCheckedChange={(enabled) => handleToggle('automated_work_weekend_1_day_enabled', enabled)}
                  />
                  <Label htmlFor="work-weekend-1-day" className="text-sm">1-day reminders</Label>
                </div>
              </div>
            )}
            
            <div className="border-l-4 border-orange-200 pl-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                • Reminds all families about upcoming work weekends
              </p>
              <p className="text-xs text-muted-foreground">
                • Includes work weekend details and organizer information
              </p>
            </div>
          </div>

          {!anyEnabled && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">All automated reminders are currently disabled</p>
                <p className="text-muted-foreground">
                  Enable the reminder types you want to automate. You can disable them at any time.
                </p>
              </div>
            </div>
          )}

          {anyEnabled && (
            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg">
              <Settings className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">Automated reminders are active</p>
                <p className="text-muted-foreground">
                  The system is now sending automated notifications according to your enabled settings.
                  Monitor the notification logs to track delivery.
                </p>
              </div>
            </div>
          )}

          {/* Calendar Keeper Notification Copies */}
          <div className="space-y-4 border-t pt-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="calendar-keeper-copies" className="text-sm font-medium">
                  Calendar Keeper Notification Copies
                </Label>
                <CardDescription>
                  Enable to receive copies of automated notifications with granular filtering options
                </CardDescription>
              </div>
              <Switch
                id="calendar-keeper-copies"
                checked={settings.calendar_keeper_receives_notification_copies}
                onCheckedChange={(enabled) => handleToggle('calendar_keeper_receives_notification_copies', enabled)}
              />
            </div>

            {settings.calendar_keeper_receives_notification_copies && (
              <div className="ml-6 space-y-6 pt-4 border-l-2 border-border pl-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Reservation Reminders</h4>
                    <CardDescription className="mb-3">
                      Copies of automated reminders sent before reservations
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-reminder-7"
                          checked={settings.ck_copy_reminder_7_day}
                          onCheckedChange={(checked) => handleToggle('ck_copy_reminder_7_day', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-reminder-7" className="text-sm cursor-pointer">7-day reminders</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-reminder-3"
                          checked={settings.ck_copy_reminder_3_day}
                          onCheckedChange={(checked) => handleToggle('ck_copy_reminder_3_day', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-reminder-3" className="text-sm cursor-pointer">3-day reminders</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-reminder-1"
                          checked={settings.ck_copy_reminder_1_day}
                          onCheckedChange={(checked) => handleToggle('ck_copy_reminder_1_day', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-reminder-1" className="text-sm cursor-pointer">1-day reminders</label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Selection Period Notifications</h4>
                    <CardDescription className="mb-3">
                      Copies of calendar selection turn notifications
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-selection-start"
                          checked={settings.ck_copy_selection_turn_start}
                          onCheckedChange={(checked) => handleToggle('ck_copy_selection_turn_start', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-selection-start" className="text-sm cursor-pointer">Selection turn start notifications</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-selection-ending"
                          checked={settings.ck_copy_selection_ending_tomorrow}
                          onCheckedChange={(checked) => handleToggle('ck_copy_selection_ending_tomorrow', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-selection-ending" className="text-sm cursor-pointer">Selection ending tomorrow reminders</label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Work Weekend Notifications</h4>
                    <CardDescription className="mb-3">
                      Copies of work weekend related communications
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-work-reminder"
                          checked={settings.ck_copy_work_weekend_reminder}
                          onCheckedChange={(checked) => handleToggle('ck_copy_work_weekend_reminder', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-work-reminder" className="text-sm cursor-pointer">Work weekend reminders (7/3/1 day)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-work-proposed"
                          checked={settings.ck_copy_work_weekend_proposed}
                          onCheckedChange={(checked) => handleToggle('ck_copy_work_weekend_proposed', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-work-proposed" className="text-sm cursor-pointer">Work weekend proposals</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-work-invitation"
                          checked={settings.ck_copy_work_weekend_invitation}
                          onCheckedChange={(checked) => handleToggle('ck_copy_work_weekend_invitation', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-work-invitation" className="text-sm cursor-pointer">Work weekend invitations</label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Booking Status Notifications</h4>
                    <CardDescription className="mb-3">
                      Copies of booking confirmations and cancellations
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-confirmation"
                          checked={settings.ck_copy_confirmation}
                          onCheckedChange={(checked) => handleToggle('ck_copy_confirmation', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-confirmation" className="text-sm cursor-pointer">Booking confirmations</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-cancellation"
                          checked={settings.ck_copy_cancellation}
                          onCheckedChange={(checked) => handleToggle('ck_copy_cancellation', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-cancellation" className="text-sm cursor-pointer">Booking cancellations</label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Manual Notifications</h4>
                    <CardDescription className="mb-3">
                      Copies of custom template notifications sent manually
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ck-copy-manual"
                          checked={settings.ck_copy_manual_template}
                          onCheckedChange={(checked) => handleToggle('ck_copy_manual_template', checked as boolean)}
                        />
                        <label htmlFor="ck-copy-manual" className="text-sm cursor-pointer">Manual template notifications</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Reminders Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Preview Upcoming Reminders</CardTitle>
            </div>
            <Switch
              checked={showPreview}
              onCheckedChange={setShowPreview}
            />
          </div>
          <CardDescription>
            See exactly what automated reminders will be sent in the next 30 days
          </CardDescription>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <UpcomingRemindersPreview automatedSettings={settings} />
          </CardContent>
        )}
      </Card>
    </div>
  );
};