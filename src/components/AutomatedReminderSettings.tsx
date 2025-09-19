import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Settings, AlertTriangle, Calendar, Hammer } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutomatedSettings {
  automated_reminders_enabled: boolean;
  automated_selection_reminders_enabled: boolean;
  automated_work_weekend_reminders_enabled: boolean;
}

export const AutomatedReminderSettings = () => {
  const { organization, loading: orgLoading } = useOrganization();
  const [settings, setSettings] = useState<AutomatedSettings>({
    automated_reminders_enabled: false,
    automated_selection_reminders_enabled: false,
    automated_work_weekend_reminders_enabled: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      fetchAutomatedReminderStatus();
    }
  }, [organization]);

  const fetchAutomatedReminderStatus = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('automated_reminders_enabled, automated_selection_reminders_enabled, automated_work_weekend_reminders_enabled')
        .eq('id', organization.id)
        .single();

      if (error) {
        console.error('Error fetching automated reminder status:', error);
        toast.error('Failed to load automated reminder settings');
        return;
      }

      setSettings({
        automated_reminders_enabled: data?.automated_reminders_enabled || false,
        automated_selection_reminders_enabled: data?.automated_selection_reminders_enabled || false,
        automated_work_weekend_reminders_enabled: data?.automated_work_weekend_reminders_enabled || false,
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load automated reminder settings');
    } finally {
      setLoading(false);
    }
  };

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
        automated_selection_reminders_enabled: 'selection period reminders',
        automated_work_weekend_reminders_enabled: 'work weekend reminders',
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
                    settings.automated_selection_reminders_enabled || 
                    settings.automated_work_weekend_reminders_enabled;

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
                    Automatically send 7-day, 3-day, and 1-day reminders for upcoming reservations
                  </p>
                </div>
              </div>
              <Switch
                id="reservation-reminders"
                checked={settings.automated_reminders_enabled}
                onCheckedChange={(enabled) => handleToggle('automated_reminders_enabled', enabled)}
              />
            </div>
            
            <div className="border-l-4 border-muted pl-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                • Sends reminders based on your configured templates
              </p>
              <p className="text-xs text-muted-foreground">
                • Respects family group preferences and contact methods
              </p>
            </div>
          </div>

          {/* Selection Period Reminders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <Label htmlFor="selection-reminders" className="text-sm font-medium">
                    Selection Period Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send notifications when selection periods start (3 days ahead) and end (same day)
                  </p>
                </div>
              </div>
              <Switch
                id="selection-reminders"
                checked={settings.automated_selection_reminders_enabled}
                onCheckedChange={(enabled) => handleToggle('automated_selection_reminders_enabled', enabled)}
              />
            </div>
            
            <div className="border-l-4 border-blue-200 pl-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                • Alerts families 3 days before selection periods open
              </p>
              <p className="text-xs text-muted-foreground">
                • Final reminder on the last day of selection periods
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
                    Send reminders 7, 3, and 1 day before scheduled work weekends
                  </p>
                </div>
              </div>
              <Switch
                id="work-weekend-reminders"
                checked={settings.automated_work_weekend_reminders_enabled}
                onCheckedChange={(enabled) => handleToggle('automated_work_weekend_reminders_enabled', enabled)}
              />
            </div>
            
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
        </CardContent>
      </Card>
    </div>
  );
};