import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Settings, AlertTriangle } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AutomatedReminderSettings = () => {
  const { organization, loading: orgLoading } = useOrganization();
  const [isEnabled, setIsEnabled] = useState(false);
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
        .select('automated_reminders_enabled')
        .eq('id', organization.id)
        .single();

      if (error) {
        console.error('Error fetching automated reminder status:', error);
        toast.error('Failed to load automated reminder settings');
        return;
      }

      setIsEnabled(data?.automated_reminders_enabled || false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load automated reminder settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ automated_reminders_enabled: enabled })
        .eq('id', organization.id);

      if (error) {
        console.error('Error updating automated reminder setting:', error);
        toast.error('Failed to update automated reminder settings');
        return;
      }

      setIsEnabled(enabled);
      toast.success(
        enabled 
          ? 'Automated reminders enabled successfully' 
          : 'Automated reminders disabled successfully'
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Automated Reminder System</CardTitle>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription>
            Control whether the system automatically sends reminder notifications to guests
            based on your reminder templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="automated-reminders"
                checked={isEnabled}
                onCheckedChange={handleToggle}
              />
              <Label htmlFor="automated-reminders" className="text-sm font-medium">
                Enable Automated Reminders
              </Label>
            </div>
          </div>

          <div className="border-l-4 border-muted pl-4 space-y-2">
            <h4 className="font-medium text-sm">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• System checks for upcoming reservations daily</li>
              <li>• Sends reminders based on your configured templates</li>
              <li>• Automatically triggers 7-day, 3-day, and 1-day notifications</li>
              <li>• Respects family group preferences and contact methods</li>
            </ul>
          </div>

          {!isEnabled && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">System is currently disabled</p>
                <p className="text-muted-foreground">
                  Enable automated reminders to start sending notifications based on your templates.
                  You can disable this at any time.
                </p>
              </div>
            </div>
          )}

          {isEnabled && (
            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg">
              <Settings className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">System is active</p>
                <p className="text-muted-foreground">
                  Automated reminders are now being sent according to your template configuration.
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