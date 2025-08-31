import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Mail, MessageSquare, Send, Users } from 'lucide-react';

const NOTIFICATION_TYPES = [
  { value: 'reminder_7', label: '7-Day Reminder', days: 7 },
  { value: 'reminder_3', label: '3-Day Reminder', days: 3 },
  { value: 'reminder_1', label: '1-Day Reminder', days: 1 },
  { value: 'confirmation', label: 'Confirmation Email', days: null },
  { value: 'cancellation', label: 'Cancellation Email', days: null },
];

interface UpcomingReservation {
  id: string;
  family_group: string;
  start_date: string;
  end_date: string;
  guest_email: string;
  guest_name: string;
  guest_phone?: string;
}

export const NotificationTest = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationType, setNotificationType] = useState('reminder_3');
  const [selectedReservation, setSelectedReservation] = useState('');
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  // Fetch upcoming reservations for testing with real data
  useEffect(() => {
    if (organization?.id) {
      fetchUpcomingReservations();
    }
  }, [organization?.id]);

  const fetchUpcomingReservations = async () => {
    if (!organization?.id) return;
    
    setIsLoadingReservations(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
          id,
          family_group,
          start_date,
          end_date
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('start_date', today)
        .lte('start_date', thirtyDaysFromNow)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching reservations:', error);
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
        const familyGroup = familyGroups?.find(fg => fg.name === reservation.family_group);

        return {
          id: reservation.id,
          family_group: reservation.family_group,
          start_date: reservation.start_date,
          end_date: reservation.end_date,
          guest_email: familyGroup?.lead_email || '',
          guest_name: familyGroup?.lead_name || '',
          guest_phone: familyGroup?.lead_phone || undefined,
        };
      }) || [];

      setUpcomingReservations(processedReservations);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingReservations(false);
    }
  };

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
      
      let requestBody: any;
      
      if (selectedReservation && selectedReservation !== 'test') {
        // Use real reservation data
        const reservation = upcomingReservations.find(r => r.id === selectedReservation);
        if (!reservation) {
          toast({
            title: "Error",
            description: "Selected reservation not found",
            variant: "destructive",
          });
          return;
        }
        
        requestBody = {
          type: isReminder ? 'reminder' : notificationType,
          organization_id: organization.id,
          reservation: {
            id: reservation.id,
            family_group_name: reservation.family_group,
            check_in_date: reservation.start_date,
            check_out_date: reservation.end_date,
            guest_email: email, // Override with test email
            guest_name: reservation.guest_name,
            guest_phone: reservation.guest_phone,
          }
        };
      } else {
        // Use test data
        requestBody = {
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
      }

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
          <Label htmlFor="test-reservation" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Test with Real Reservation Data
          </Label>
          <Select value={selectedReservation} onValueChange={setSelectedReservation}>
            <SelectTrigger>
              <SelectValue placeholder="Use test data or select real reservation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Use Test Data</SelectItem>
              {isLoadingReservations ? (
                <SelectItem value="loading" disabled>Loading reservations...</SelectItem>
              ) : (
                upcomingReservations.map((reservation) => (
                  <SelectItem key={reservation.id} value={reservation.id}>
                    {reservation.family_group} - {new Date(reservation.start_date).toLocaleDateString()}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <Separator />

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
          onClick={sendTestNotification} 
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? 'Sending Test...' : `Send Test ${NOTIFICATION_TYPES.find(t => t.value === notificationType)?.label}`}
        </Button>
        
        {selectedReservation && selectedReservation !== 'test' && (
          <p className="text-sm text-muted-foreground text-center">
            This will send the notification to your email using real data from the selected reservation
          </p>
        )}
      </CardContent>
    </Card>
  );
};