import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageSquare, Send } from 'lucide-react';

export const NotificationTest = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendTestNotifications = async () => {
    if (!email && !phone) {
      toast({
        title: "Missing Information",
        description: "Please provide either an email or phone number to test",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Send test email
      if (email) {
        const { error: emailError } = await supabase.functions.invoke('send-message', {
          body: {
            organizationId: 'test',
            subject: 'CabinBuddy Test Email',
            message: 'This is a test email from CabinBuddy to verify your email system is working correctly. If you received this, your email notifications are configured properly!',
            recipientGroup: 'test',
            messageType: 'email',
            testEmail: email,
            urgent: false
          }
        });

        if (emailError) {
          console.error('Email test error:', emailError);
          toast({
            title: "Email Test Failed",
            description: emailError.message || "Failed to send test email",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Test Email Sent",
            description: `Test email sent to ${email}`,
          });
        }
      }

      // Send test SMS
      if (phone) {
        const { error: smsError } = await supabase.functions.invoke('send-message', {
          body: {
            organizationId: 'test',
            subject: 'CabinBuddy Test',
            message: 'This is a test SMS from CabinBuddy. Your SMS notifications are working!',
            recipientGroup: 'test',
            messageType: 'sms',
            testPhone: phone,
            urgent: false
          }
        });

        if (smsError) {
          console.error('SMS test error:', smsError);
          toast({
            title: "SMS Test Failed",
            description: smsError.message || "Failed to send test SMS",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Test SMS Sent",
            description: `Test SMS sent to ${phone}`,
          });
        }
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: "Test Failed",
        description: "An unexpected error occurred while sending test messages",
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
          Test Notifications
        </CardTitle>
        <CardDescription>
          Send test email and SMS messages to verify your notification system is working
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
          </Label>
          <Input
            id="test-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <Button 
          onClick={sendTestNotifications} 
          disabled={isLoading || (!email && !phone)}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Test Messages'}
        </Button>
      </CardContent>
    </Card>
  );
};