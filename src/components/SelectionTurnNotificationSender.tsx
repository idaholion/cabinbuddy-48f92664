import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Bell, Send } from 'lucide-react';

interface FamilyGroup {
  name: string;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
}

export const SelectionTurnNotificationSender = () => {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [selectedFamily, setSelectedFamily] = useState('');
  const [rotationYear, setRotationYear] = useState(new Date().getFullYear());
  const [notificationType, setNotificationType] = useState<'starting' | 'ending'>('starting');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  useEffect(() => {
    if (organization?.id) {
      fetchFamilyGroups();
    }
  }, [organization?.id]);

  const fetchFamilyGroups = async () => {
    if (!organization?.id) return;
    
    setIsLoadingFamilies(true);
    try {
      const { data: families, error } = await supabase
        .from('family_groups')
        .select('name, lead_name, lead_email, lead_phone')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) {
        console.error('Error fetching family groups:', error);
        toast({
          title: "Error",
          description: "Failed to load family groups",
          variant: "destructive",
        });
        return;
      }

      setFamilyGroups(families || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingFamilies(false);
    }
  };

  const sendNotification = async () => {
    if (!selectedFamily) {
      toast({
        title: "Family Required",
        description: "Please select a family group",
        variant: "destructive",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        title: "Organization Required",
        description: "Please select an organization first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-selection-turn-notification', {
        body: {
          organization_id: organization.id,
          family_group: selectedFamily,
          rotation_year: rotationYear,
          notification_type: notificationType === 'ending' ? 'ending_tomorrow' : undefined
        }
      });

      if (error) {
        console.error('Notification error:', error);
        toast({
          title: "Notification Failed",
          description: error.message || "Failed to send selection turn notification",
          variant: "destructive",
        });
      } else {
        const selectedFamilyData = familyGroups.find(f => f.name === selectedFamily);
        toast({
          title: "Notification Sent",
          description: `Selection turn notification sent to ${selectedFamily}${selectedFamilyData?.lead_email ? ` (${selectedFamilyData.lead_email})` : ''}`,
        });
      }
    } catch (error) {
      console.error('Notification error:', error);
      toast({
        title: "Notification Failed",
        description: "An unexpected error occurred while sending the notification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFamilyData = familyGroups.find(f => f.name === selectedFamily);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Send Selection Turn Notification
        </CardTitle>
        <CardDescription>
          Manually send selection turn notifications to family groups for their calendar selection period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="family-group">Family Group</Label>
          <Select value={selectedFamily} onValueChange={setSelectedFamily} disabled={isLoadingFamilies}>
            <SelectTrigger id="family-group">
              <SelectValue placeholder={isLoadingFamilies ? "Loading families..." : "Select family group"} />
            </SelectTrigger>
            <SelectContent>
              {familyGroups.map((family) => (
                <SelectItem key={family.name} value={family.name}>
                  {family.name} {family.lead_name ? `(${family.lead_name})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedFamilyData && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Contact Information:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Name:</strong> {selectedFamilyData.lead_name || 'Not set'}</p>
              <p><strong>Email:</strong> {selectedFamilyData.lead_email || 'Not set'}</p>
              <p><strong>Phone:</strong> {selectedFamilyData.lead_phone || 'Not set'}</p>
            </div>
            {(!selectedFamilyData.lead_email && !selectedFamilyData.lead_phone) && (
              <p className="text-destructive text-sm font-medium">
                ⚠️ No contact information available - notification cannot be sent
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notification-type">Notification Type</Label>
          <Select value={notificationType} onValueChange={(v) => setNotificationType(v as 'starting' | 'ending')}>
            <SelectTrigger id="notification-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starting">Selection Period Starting</SelectItem>
              <SelectItem value="ending">Selection Period Ending Tomorrow</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rotation-year">Rotation Year</Label>
          <Select value={rotationYear.toString()} onValueChange={(v) => setRotationYear(parseInt(v))}>
            <SelectTrigger id="rotation-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - 1 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={sendNotification} 
          disabled={isLoading || !selectedFamily || (!selectedFamilyData?.lead_email && !selectedFamilyData?.lead_phone)}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {isLoading ? 'Sending Notification...' : 'Send Selection Turn Notification'}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          This will send an email and/or SMS notification to the selected family group about their selection turn
        </p>
      </CardContent>
    </Card>
  );
};
