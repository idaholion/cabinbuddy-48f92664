import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const SupervisorUserTools = () => {
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (confirmationCode !== 'CONFIRM_EMAIL_FIX') {
      toast.error('Please type CONFIRM_EMAIL_FIX to confirm');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('supervisor_fix_user_email', {
        p_old_email: oldEmail.trim().toLowerCase(),
        p_new_email: newEmail.trim().toLowerCase(),
        p_confirmation_code: confirmationCode,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast.success(`Login email changed from ${oldEmail} to ${newEmail}`);
        setOldEmail('');
        setNewEmail('');
        setConfirmationCode('');
      } else {
        toast.error(result?.error || 'Failed to change email');
      }
    } catch (error: any) {
      console.error('Email change error:', error);
      toast.error(error.message || 'Failed to change login email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Change User Login Email
        </CardTitle>
        <CardDescription className="text-base">
          Change a user's authentication (login) email. This should only be done at the user's request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> This changes only the user's <em>login credential</em>. 
            Contact emails in family group settings (lead email, host member emails) are separate and must be updated manually if needed.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleEmailChange} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="old-email" className="text-base">Current Login Email</Label>
            <Input
              id="old-email"
              type="email"
              placeholder="user@current-email.com"
              value={oldEmail}
              onChange={(e) => setOldEmail(e.target.value)}
              required
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email" className="text-base">New Login Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="user@new-email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-code" className="text-base">
              Confirmation Code
            </Label>
            <Input
              id="confirm-code"
              placeholder="Type CONFIRM_EMAIL_FIX"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              required
              className="text-base font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Type <code className="bg-muted px-1 rounded">CONFIRM_EMAIL_FIX</code> to confirm this action
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !oldEmail || !newEmail || confirmationCode !== 'CONFIRM_EMAIL_FIX'}
            className="text-base"
          >
            {isSubmitting ? 'Updating...' : 'Change Login Email'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
