import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Self-service login-email change. The person enters a new address; Supabase
 * sends a confirmation link to the NEW address. Clicking that link completes
 * the change — no admin or supervisor involved.
 *
 * Distinct from the "contact email" shown to the family group: this changes
 * how you sign in. After confirmation, a database trigger keeps contact
 * emails in sync for leads.
 */
export const ChangeSignInEmail = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    if (user?.email && email === user.email.toLowerCase()) {
      toast({
        title: 'Same email',
        description: 'That is already your sign-in email.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;

      toast({
        title: 'Confirmation email sent',
        description: `Check ${email} for a confirmation link and click it to finish. Your current sign-in (${user?.email}) keeps working until you confirm.`,
      });
      setNewEmail('');
    } catch (err: any) {
      toast({
        title: 'Could not change email',
        description: err?.message || 'Please try again or ask your administrator for help.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md border-t pt-4">
      <div>
        <Label htmlFor="new-signin-email" className="text-base">Change your sign-in email</Label>
        <p className="text-sm text-muted-foreground mt-1">
          This changes the email you use to log in. We will send a confirmation
          link to the new address — the change only happens after you click it.
          This is different from the contact email other members see.
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          id="new-signin-email"
          type="email"
          placeholder="new@email.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="text-base"
          required
        />
        <Button type="submit" disabled={sending || !newEmail.trim()} className="whitespace-nowrap">
          <Mail className="h-4 w-4 mr-2" />
          {sending ? 'Sending...' : 'Send Confirmation'}
        </Button>
      </div>
    </form>
  );
};
