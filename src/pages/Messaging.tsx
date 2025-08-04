import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MessageSquare, Send, Users, User, Shield, UserCog } from 'lucide-react';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { supabase } from '@/integrations/supabase/client';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { useToast } from '@/hooks/use-toast';

type RecipientGroup = 'administrator' | 'calendar_keeper' | 'group_leads' | 'all_users';
type MessageType = 'email' | 'sms' | 'both';

const Messaging = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>('administrator');
  const [messageType, setMessageType] = useState<MessageType>('email');
  const [urgent, setUrgent] = useState(false);
  
  const { activeOrganization } = useMultiOrganization();
  const { toast } = useToast();
  
  const { loading, execute } = useAsyncOperation({
    successMessage: 'Message sent successfully!',
    errorMessage: 'Failed to send message'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    await execute(async () => {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          organizationId: activeOrganization.organization_id,
          subject,
          message,
          recipientGroup,
          messageType,
          urgent
        }
      });

      if (error) throw new Error(error.message);
      
      // Reset form
      setSubject('');
      setMessage('');
      setUrgent(false);
    });
  };

  const getRecipientIcon = (group: RecipientGroup) => {
    switch (group) {
      case 'administrator':
        return <Shield className="h-4 w-4" />;
      case 'calendar_keeper':
        return <UserCog className="h-4 w-4" />;
      case 'group_leads':
        return <User className="h-4 w-4" />;
      case 'all_users':
        return <Users className="h-4 w-4" />;
    }
  };

  const getRecipientDescription = (group: RecipientGroup) => {
    switch (group) {
      case 'administrator':
        return 'Send message to organization administrator';
      case 'calendar_keeper':
        return 'Send message to calendar keeper';
      case 'group_leads':
        return 'Send message to all family group leads';
      case 'all_users':
        return 'Send message to all users in the organization';
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Messaging Center</h1>
        <p className="text-muted-foreground mt-2">
          Send messages to administrators, calendar keepers, group leads, or all users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Compose Message
          </CardTitle>
          <CardDescription>
            Choose your recipients and delivery method below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Group Selection */}
            <div className="space-y-3">
              <Label htmlFor="recipient-group">Send to</Label>
              <Select value={recipientGroup} onValueChange={(value: RecipientGroup) => setRecipientGroup(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Administrator
                    </div>
                  </SelectItem>
                  <SelectItem value="calendar_keeper">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Calendar Keeper
                    </div>
                  </SelectItem>
                  <SelectItem value="group_leads">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      All Group Leads
                    </div>
                  </SelectItem>
                  <SelectItem value="all_users">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Users
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {getRecipientIcon(recipientGroup)}
                {getRecipientDescription(recipientGroup)}
              </p>
            </div>

            {/* Message Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="message-type">Delivery method</Label>
              <Select value={messageType} onValueChange={(value: MessageType) => setMessageType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email only
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Text message only
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <MessageSquare className="h-4 w-4" />
                      Both email and text
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
                required
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={6}
                required
              />
            </div>

            {/* Urgent Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="urgent" 
                checked={urgent}
                onCheckedChange={(checked) => setUrgent(checked as boolean)}
              />
              <Label htmlFor="urgent" className="text-sm font-medium">
                Mark as urgent
              </Label>
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={loading} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Messaging;