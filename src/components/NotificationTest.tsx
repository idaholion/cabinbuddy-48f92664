import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Mail, MessageSquare, Send } from 'lucide-react';

export const NotificationTest = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const sendTestReminder = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please provide an email address to test reminder notifications",
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
      // Send test reminder notification
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'reminder',
          organization_id: organization.id,
          reservation: {
            id: 'test-reservation-id',
            family_group_name: 'Test Family Group',
            check_in_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
            check_out_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
            guest_email: email,
            guest_name: 'Test Guest',
            guest_phone: phone || undefined,
          },
          days_until: 3,
        }
      });

      if (error) {
        console.error('Test reminder error:', error);
        toast({
          title: "Test Reminder Failed",
          description: error.message || "Failed to send test reminder",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Test Reminder Sent",
          description: `Test reminder notification sent to ${email}`,
        });
      }
    } catch (error) {
      console.error('Test reminder error:', error);
      toast({
        title: "Test Failed",
        description: "An unexpected error occurred while sending the test reminder",
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
          Test Reminder Notification
        </CardTitle>
        <CardDescription>
          Send a test reminder email to verify your reservation reminder system is working
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          onClick={sendTestReminder} 
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? 'Sending Test Reminder...' : 'Send Test Reminder'}
        </Button>
      </CardContent>
    </Card>
  );
};