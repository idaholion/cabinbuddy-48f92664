import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Mail, MessageSquare, Send } from 'lucide-react';

const NOTIFICATION_TYPES = [
  { value: 'reminder_7', label: '7-Day Reminder', days: 7 },
  { value: 'reminder_3', label: '3-Day Reminder', days: 3 },
  { value: 'reminder_1', label: '1-Day Reminder', days: 1 },
  { value: 'confirmation', label: 'Confirmation Email', days: null },
  { value: 'cancellation', label: 'Cancellation Email', days: null },
];

export const NotificationTest = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationType, setNotificationType] = useState('reminder_3');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const sendTestNotification = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please provide an email address to test notifications",
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
      const selectedType = NOTIFICATION_TYPES.find(t => t.value === notificationType);
      const isReminder = notificationType.startsWith('reminder_');
      
      const requestBody: any = {
        type: isReminder ? 'reminder' : notificationType,
        organization_id: organization.id,
        reservation: {
          id: 'test-reservation-id',
          family_group_name: 'Test Family Group',
          check_in_date: new Date(Date.now() + (selectedType?.days || 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          check_out_date: new Date(Date.now() + ((selectedType?.days || 3) + 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          guest_email: email,
          guest_name: 'Test Guest',
          guest_phone: phone || undefined,
        }
      };

      if (isReminder) {
        requestBody.days_until = selectedType?.days;
      }

      const { error } = await supabase.functions.invoke('send-notification', {
        body: requestBody
      });

      if (error) {
        console.error('Test notification error:', error);
        toast({
          title: "Test Failed",
          description: error.message || "Failed to send test notification",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Test Notification Sent",
          description: `Test ${selectedType?.label.toLowerCase()} sent to ${email}`,
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: "Test Failed",
        description: "An unexpected error occurred while sending the test notification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Test Notification System
        </CardTitle>
        <CardDescription>
          Send test emails to verify how different notification types will look
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notification-type">Notification Type</Label>
          <Select value={notificationType} onValueChange={setNotificationType}>
            <SelectTrigger>
              <SelectValue placeholder="Select notification type" />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="test-email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-phone" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Phone Number
            <span className="text-xs text-muted-foreground">(Coming Soon)</span>
          </Label>
          <Input
            id="test-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled
            className="opacity-50"
          />
        </div>

        <Button 
          onClick={sendTestNotification} 
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? 'Sending Test...' : `Send Test ${NOTIFICATION_TYPES.find(t => t.value === notificationType)?.label}`}
        </Button>
      </CardContent>
    </Card>
  );
};